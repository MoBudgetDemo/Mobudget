# MoBudget Database Schema

Recommended Google Sheet tabs:

## Sessions
SessionID | Timestamp | Mode | ParticipantInfo | TestOnly

## BudgetInputs
SessionID | Timestamp | Income | Expenses | DisposableIncome | SavingsRate

## RateSnapshot
SessionID | Timestamp | Bank | Product | Category | DisplayRate | NumericRate | SourceURL | DateCollected | Notes

## ActivityLog
SessionID | Timestamp | Action

Privacy rule: do not store names, bank login details, account numbers, card numbers, or national ID.
