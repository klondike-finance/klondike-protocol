pragma solidity ^0.6.0;

import '@openzeppelin/contracts/GSN/Context.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './Operator.sol';

contract TraderOperator is Context, Ownable, Operator {
    address private _traderOperator;

    event TraderOperatorTransferred(
        address indexed previousTraderOperator,
        address indexed newTraderOperator
    );

    constructor() internal {
        _traderOperator = _msgSender();
        emit TraderOperatorTransferred(address(0), _traderOperator);
    }

    function traderOperator() public view returns (address) {
        return _traderOperator;
    }

    modifier onlyTraderOperator() {
        require(
            _traderOperator == msg.sender,
            'traderOperator: caller is not the traderOperator'
        );
        _;
    }

    function isTraderOperator() public view returns (bool) {
        return _msgSender() == _traderOperator;
    }

    function transferTraderOperator(address newTraderOperator_) public onlyOperator {
        _transferTraderOperator(newTraderOperator_);
    }

    function _transferTraderOperator(address newTraderOperator_) internal {
        require(
            newTraderOperator_ != address(0),
            'traderOperator: zero address given for new traderOperator'
        );
        emit TraderOperatorTransferred(address(0), newTraderOperator_);
        _traderOperator = newTraderOperator_;
    }
}
