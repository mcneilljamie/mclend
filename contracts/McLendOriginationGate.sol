// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
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

interface IVariableDebtToken {
    function approveDelegation(address delegatee, uint256 amount) external;
    function borrowAllowance(address fromUser, address toUser) external view returns (uint256);
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
    using SafeERC20 for IERC20;

    IPool public immutable aavePool;
    ISwapRouter public immutable uniswapRouter;
    IMcFunFactory public immutable mcFunFactory;
    IERC20 public immutable usdt;
    IWETH public immutable weth;
    IERC20 public immutable mclend;
    IVariableDebtToken public immutable variableDebtUSDT;
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
    error InsufficientCreditDelegation(address user, uint256 required, uint256 current);
    error SwapInsufficientOutput(string swapType, uint256 expected, uint256 actual);
    error ResidualBalance(string token, uint256 amount);

    constructor(
        address _aavePool,
        address _uniswapRouter,
        address _mcFunFactory,
        address _usdt,
        address _weth,
        address _mclend,
        address _variableDebtUSDT
    ) {
        if (
            _aavePool == address(0) ||
            _uniswapRouter == address(0) ||
            _mcFunFactory == address(0) ||
            _usdt == address(0) ||
            _weth == address(0) ||
            _mclend == address(0) ||
            _variableDebtUSDT == address(0)
        ) {
            revert InvalidAddress();
        }

        aavePool = IPool(_aavePool);
        uniswapRouter = ISwapRouter(_uniswapRouter);
        mcFunFactory = IMcFunFactory(_mcFunFactory);
        usdt = IERC20(_usdt);
        weth = IWETH(_weth);
        mclend = IERC20(_mclend);
        variableDebtUSDT = IVariableDebtToken(_variableDebtUSDT);
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

        uint256 currentAllowance = variableDebtUSDT.borrowAllowance(msg.sender, address(this));
        if (currentAllowance < grossAmount) {
            revert InsufficientCreditDelegation(msg.sender, grossAmount, currentAllowance);
        }

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

        usdt.safeTransferFrom(msg.sender, address(this), feeAmount);

        emit FeeCollected(msg.sender, feeAmount, block.timestamp);

        _executeFeeSwapBurn(feeAmount, minEthOut, minMclendOut, deadline);
    }

    function _executeFeeSwapBurn(
        uint256 usdtAmount,
        uint256 minEthOut,
        uint256 minMclendOut,
        uint256 deadline
    ) internal {
        usdt.forceApprove(address(uniswapRouter), usdtAmount);

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
            revert SwapInsufficientOutput("USDT->WETH", minEthOut, ethReceived);
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
            revert SwapInsufficientOutput("ETH->MCLEND", minMclendOut, mclendReceived);
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

        mclend.safeTransfer(DEAD_ADDRESS, actualMclendReceived);

        emit TokensBurned(
            address(mclend),
            actualMclendReceived,
            block.timestamp
        );

        _verifyNoResidualBalances();
    }

    function _verifyNoResidualBalances() internal view {
        uint256 usdtBalance = usdt.balanceOf(address(this));
        uint256 wethBalance = weth.balanceOf(address(this));
        uint256 ethBalance = address(this).balance;
        uint256 mclendBalance = mclend.balanceOf(address(this));

        if (usdtBalance > 1) {
            revert ResidualBalance("USDT", usdtBalance);
        }
        if (wethBalance > 1) {
            revert ResidualBalance("WETH", wethBalance);
        }
        if (ethBalance > 1) {
            revert ResidualBalance("ETH", ethBalance);
        }
        if (mclendBalance > 1) {
            revert ResidualBalance("MCLEND", mclendBalance);
        }
    }

    function getRequiredDelegation(uint256 netAmount) external pure returns (uint256) {
        uint256 feeAmount = (netAmount * ORIGINATION_FEE_BPS) / BPS_DENOMINATOR;
        return netAmount + feeAmount;
    }

    function checkUserDelegation(address user, uint256 netAmount) external view returns (bool, uint256, uint256) {
        uint256 required = (netAmount * (BPS_DENOMINATOR + ORIGINATION_FEE_BPS)) / BPS_DENOMINATOR;
        uint256 current = variableDebtUSDT.borrowAllowance(user, address(this));
        return (current >= required, required, current);
    }

    receive() external payable {}
}
