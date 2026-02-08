// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
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

contract McLendBorrowGate is Ownable, ReentrancyGuard {
    IPool public immutable aavePool;
    address public feeReceiver;
    uint256 public feeBps;
    uint256 public constant MAX_FEE_BPS = 500;
    uint256 public constant BPS_DENOMINATOR = 10000;

    event BorrowWithFee(
        address indexed user,
        address indexed asset,
        uint256 netAmount,
        uint256 feeAmount,
        uint256 grossAmount,
        uint256 timestamp
    );

    event FeeReceiverUpdated(address indexed oldReceiver, address indexed newReceiver);
    event FeeBpsUpdated(uint256 oldFeeBps, uint256 newFeeBps);

    error InvalidAddress();
    error FeeTooHigh();
    error TransferFailed();
    error InvalidAmount();

    constructor(
        address _aavePool,
        address _feeReceiver,
        uint256 _feeBps
    ) Ownable(msg.sender) {
        if (_aavePool == address(0) || _feeReceiver == address(0)) {
            revert InvalidAddress();
        }
        if (_feeBps > MAX_FEE_BPS) {
            revert FeeTooHigh();
        }

        aavePool = IPool(_aavePool);
        feeReceiver = _feeReceiver;
        feeBps = _feeBps;
    }

    function borrowWithFee(
        address asset,
        uint256 netAmount
    ) external nonReentrant {
        if (netAmount == 0) {
            revert InvalidAmount();
        }

        uint256 feeAmount = (netAmount * feeBps) / BPS_DENOMINATOR;
        uint256 grossAmount = netAmount + feeAmount;

        aavePool.borrow(
            asset,
            grossAmount,
            2,
            0,
            msg.sender
        );

        IERC20 token = IERC20(asset);

        if (feeAmount > 0) {
            bool feeSuccess = token.transferFrom(msg.sender, feeReceiver, feeAmount);
            if (!feeSuccess) {
                revert TransferFailed();
            }
        }

        bool userSuccess = token.transferFrom(msg.sender, msg.sender, netAmount);
        if (!userSuccess) {
            revert TransferFailed();
        }

        emit BorrowWithFee(
            msg.sender,
            asset,
            netAmount,
            feeAmount,
            grossAmount,
            block.timestamp
        );
    }

    function setFeeReceiver(address _feeReceiver) external onlyOwner {
        if (_feeReceiver == address(0)) {
            revert InvalidAddress();
        }
        address oldReceiver = feeReceiver;
        feeReceiver = _feeReceiver;
        emit FeeReceiverUpdated(oldReceiver, _feeReceiver);
    }

    function setFeeBps(uint256 _feeBps) external onlyOwner {
        if (_feeBps > MAX_FEE_BPS) {
            revert FeeTooHigh();
        }
        uint256 oldFeeBps = feeBps;
        feeBps = _feeBps;
        emit FeeBpsUpdated(oldFeeBps, _feeBps);
    }
}
