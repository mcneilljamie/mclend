// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPool {
    function borrow(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        uint16 referralCode,
        address onBehalfOf
    ) external;
}

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IMcFunFactory {
    function getPool(address token) external view returns (address);
}

interface IMcFunPool {
    function buy(uint256 minTokensOut) external payable returns (uint256 tokensOut);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract McLendOriginationGate is ReentrancyGuard {
    IPool public immutable aavePool;
    ISwapRouter public immutable uniswapRouter;
    IMcFunFactory public immutable mcFunFactory;
    IERC20 public immutable usdt;
    IWETH public immutable weth;
    IERC20 public immutable mclend;
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    uint256 public constant ORIGINATION_FEE_BPS = 100;
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint24 public constant UNISWAP_POOL_FEE = 500;

    event BorrowExecuted(
        address indexed user,
        uint256 netAmount,
        uint256 feeAmount,
        uint256 grossAmount,
        uint256 timestamp
    );

    event FeeCollected(
        address indexed user,
        uint256 usdtAmount,
        uint256 timestamp
    );

    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp
    );

    event TokensBurned(
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );

    error InvalidAddress();
    error InvalidAmount();
    error TransferFailed();
    error SwapFailed();
    error InsufficientOutput();
    error DeadlinePassed();

    constructor(
        address _aavePool,
        address _uniswapRouter,
        address _mcFunFactory,
        address _usdt,
        address _weth,
        address _mclend
    ) {
        if (
            _aavePool == address(0) ||
            _uniswapRouter == address(0) ||
            _mcFunFactory == address(0) ||
            _usdt == address(0) ||
            _weth == address(0) ||
            _mclend == address(0)
        ) {
            revert InvalidAddress();
        }

        aavePool = IPool(_aavePool);
        uniswapRouter = ISwapRouter(_uniswapRouter);
        mcFunFactory = IMcFunFactory(_mcFunFactory);
        usdt = IERC20(_usdt);
        weth = IWETH(_weth);
        mclend = IERC20(_mclend);
    }

    function borrowWithFee(
        uint256 netAmount,
        uint256 minEthOut,
        uint256 minMclendOut,
        uint256 deadline
    ) external nonReentrant {
        if (netAmount == 0) {
            revert InvalidAmount();
        }
        if (block.timestamp > deadline) {
            revert DeadlinePassed();
        }

        uint256 feeAmount = (netAmount * ORIGINATION_FEE_BPS) / BPS_DENOMINATOR;
        uint256 grossAmount = netAmount + feeAmount;

        aavePool.borrow(
            address(usdt),
            grossAmount,
            2,
            0,
            msg.sender
        );

        emit BorrowExecuted(
            msg.sender,
            netAmount,
            feeAmount,
            grossAmount,
            block.timestamp
        );

        bool transferred = usdt.transferFrom(msg.sender, address(this), feeAmount);
        if (!transferred) {
            revert TransferFailed();
        }

        emit FeeCollected(msg.sender, feeAmount, block.timestamp);

        _executeFeeSwapBurn(feeAmount, minEthOut, minMclendOut, deadline);
    }

    function _executeFeeSwapBurn(
        uint256 usdtAmount,
        uint256 minEthOut,
        uint256 minMclendOut,
        uint256 deadline
    ) internal {
        usdt.approve(address(uniswapRouter), usdtAmount);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: address(usdt),
            tokenOut: address(weth),
            fee: UNISWAP_POOL_FEE,
            recipient: address(this),
            deadline: deadline,
            amountIn: usdtAmount,
            amountOutMinimum: minEthOut,
            sqrtPriceLimitX96: 0
        });

        uint256 ethReceived = uniswapRouter.exactInputSingle(params);

        if (ethReceived < minEthOut) {
            revert InsufficientOutput();
        }

        emit SwapExecuted(
            address(usdt),
            address(weth),
            usdtAmount,
            ethReceived,
            block.timestamp
        );

        weth.withdraw(ethReceived);

        address mcFunPool = mcFunFactory.getPool(address(mclend));
        if (mcFunPool == address(0)) {
            revert InvalidAddress();
        }

        uint256 mclendBalanceBefore = mclend.balanceOf(address(this));

        uint256 mclendReceived = IMcFunPool(mcFunPool).buy{value: ethReceived}(minMclendOut);

        if (mclendReceived < minMclendOut) {
            revert InsufficientOutput();
        }

        uint256 mclendBalanceAfter = mclend.balanceOf(address(this));
        uint256 actualMclendReceived = mclendBalanceAfter - mclendBalanceBefore;

        emit SwapExecuted(
            address(weth),
            address(mclend),
            ethReceived,
            actualMclendReceived,
            block.timestamp
        );

        bool burnSuccess = mclend.transfer(DEAD_ADDRESS, actualMclendReceived);
        if (!burnSuccess) {
            revert TransferFailed();
        }

        emit TokensBurned(
            address(mclend),
            actualMclendReceived,
            block.timestamp
        );
    }

    receive() external payable {}
}
