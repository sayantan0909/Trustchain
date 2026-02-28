
## Troubleshooting: Smart Contract Assertion Failure (pc=165)

If you encounter a `logic eval error: assert failed pc=165` (or similar) during escrow approval, it indicates that the transaction preconditions are not met.

### Root Cause
- **PC=165**: Corresponds to `Assert(Txn.accounts.length() > Int(1))` (or equivalent check depending on compilation). This assertion ensures that the Freelancer's address is included in the `accounts` array of the application call transaction.
- **Why it fails**: If the `freelancer_wallet` address is missing, invalid, or not passed correctly in the client-side code, the `accounts` array will be empty (or contain only sender if misinterpreted), causing the check to fail.
- **Other Assertions**: 
  - `Sender == Client`: Fails if someone other than the client tries to approve.
  - `Milestones Completed < Total`: Fails if all milestones are already paid out.

### Fix & Validation
We have implemented robust validation and simulation steps in the client-side code:
1. **Pre-Flight Simulation**: Before signing, the transaction is simulated against the Algorand node using `algodClient.simulate` (or dryrun). Any logic errors are caught early with detailed messages.
2. **State Validation**: The app fetches the current global state of the contract to verify that:
   - The sender matches the stored client address.
   - There are remaining milestones to be approved.
3. **Address Validation**: The freelancer address is validated before constructing the transaction.

### Running Tests
To verify the fixes, run the unit tests:
```bash
npm test
```
(Note: Tests require `jest` and mocking of `algosdk`. If you encounter setup issues, ensure you have the dev dependencies installed.)
