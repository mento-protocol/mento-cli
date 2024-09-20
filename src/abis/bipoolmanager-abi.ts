export const BIPOOL_MANAGER_ABI = [
  "function getExchangeIds() external view returns (bytes32[] memory)",
  "function getExchanges() public view returns (tuple(bytes32 exchangeId, address[] assets)[] memory _exchanges)",
  "function getPoolExchange(bytes32 exchangeId) public view returns (tuple(address asset0, address asset1, address pricingModule, uint256 bucket0, uint256 bucket1, uint256 lastBucketUpdate, tuple(uint256 spread, address referenceRateFeedID, uint256 referenceRateResetFrequency, uint256 minimumReports, uint256 stablePoolResetSize) config) exchange)",
];
