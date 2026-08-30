# Requirements Document

## Introduction

New merchants on the Aframp dashboard lack a clear starting point after signing up. This feature
adds an Onboarding Checklist component to the `/dashboard` home page that guides merchants through
four essential first steps: creating a wallet, creating a first charge, receiving a first payment,
and cashing out. The checklist disappears once all steps are completed, keeping the dashboard clean
for returning users.

## Glossary

- **Dashboard**: The main authenticated page at `/dashboard` rendered by `DashboardContent`.
- **Onboarding_Checklist**: The UI component that displays the four onboarding steps to a new merchant.
- **Step**: A single actionable item within the Onboarding_Checklist, each with a label, a completion state, and a navigation target.
- **Merchant**: An authenticated user of the Aframp dashboard.
- **Wallet**: The Stellar wallet associated with a Merchant account, created via the wallet-setup flow.
- **Charge**: A payment request created by the Merchant to collect funds from a payer.
- **Withdrawal**: A cash-out action where the Merchant transfers funds to an external bank or mobile money account.
- **Checklist_State**: The persisted record of which Steps a Merchant has completed, stored in localStorage under a merchant-scoped key.
- **Step_Status**: The completion state of a Step — either `incomplete` or `complete`.

---

## Requirements

### Requirement 1: Display Onboarding Checklist on Dashboard

**User Story:** As a new merchant, I want to see a guided checklist on my dashboard home page, so that I know exactly what to do first when I sign up.

#### Acceptance Criteria

1. WHEN the Dashboard is rendered and the Merchant has not yet completed all Steps, THE Onboarding_Checklist SHALL be displayed at the top of the dashboard content area.
2. WHEN all four Steps have a Step_Status of `complete`, THE Dashboard SHALL NOT render the Onboarding_Checklist.
3. THE Onboarding_Checklist SHALL display the following four Steps in order:
   - Step 1: Create wallet
   - Step 2: Create first charge
   - Step 3: Receive first payment
   - Step 4: Cash out
4. THE Onboarding_Checklist SHALL display a progress indicator showing the number of completed Steps out of four (e.g. "2 of 4 completed").

---

### Requirement 2: Step Navigation

**User Story:** As a new merchant, I want each checklist step to link to the relevant page, so that I can take action immediately from the checklist.

#### Acceptance Criteria

1. WHEN a Merchant clicks Step 1 (Create wallet), THE Onboarding_Checklist SHALL navigate to `/wallet-setup`.
2. WHEN a Merchant clicks Step 2 (Create first charge), THE Onboarding_Checklist SHALL navigate to `/receive`.
3. WHEN a Merchant clicks Step 3 (Receive first payment), THE Onboarding_Checklist SHALL navigate to `/onramp`.
4. WHEN a Merchant clicks Step 4 (Cash out), THE Onboarding_Checklist SHALL navigate to `/offramp`.
5. WHEN a Step has a Step_Status of `complete`, THE Onboarding_Checklist SHALL render that Step with a visual completion indicator (e.g. a checkmark icon) and SHALL still allow the Merchant to click it for re-navigation.

---

### Requirement 3: Step Completion Detection

**User Story:** As a merchant, I want completed steps to be marked automatically, so that my checklist reflects my actual progress without manual input.

#### Acceptance Criteria

1. WHEN the Dashboard detects that the Merchant has a valid Wallet address in session, THE Onboarding_Checklist SHALL mark Step 1 as `complete`.
2. WHEN the Dashboard detects that the Merchant has at least one Charge in their transaction history, THE Onboarding_Checklist SHALL mark Step 2 as `complete`.
3. WHEN the Dashboard detects that the Merchant has received at least one inbound payment, THE Onboarding_Checklist SHALL mark Step 3 as `complete`.
4. WHEN the Dashboard detects that the Merchant has completed at least one Withdrawal, THE Onboarding_Checklist SHALL mark Step 4 as `complete`.
5. THE Onboarding_Checklist SHALL re-evaluate Step completion on each Dashboard render so that Step_Status reflects the latest known state.

---

### Requirement 4: Persist Checklist State

**User Story:** As a merchant, I want my checklist progress to persist across page refreshes, so that I do not lose track of completed steps.

#### Acceptance Criteria

1. THE Onboarding_Checklist SHALL persist the Checklist_State to localStorage using a key scoped to the Merchant's wallet address.
2. WHEN the Dashboard is rendered, THE Onboarding_Checklist SHALL load the Checklist_State from localStorage before rendering Steps.
3. WHEN a Step transitions from `incomplete` to `complete`, THE Onboarding_Checklist SHALL update the Checklist_State in localStorage immediately.
4. IF localStorage is unavailable, THEN THE Onboarding_Checklist SHALL render using in-memory state only and SHALL NOT throw an error.
5. FOR ALL Checklist_State objects serialized to JSON and stored in localStorage, deserializing them back SHALL produce an equivalent Checklist_State object (round-trip property).

---

### Requirement 5: Hide Checklist After Completion

**User Story:** As a returning merchant who has completed all steps, I want the checklist to disappear from my dashboard, so that it does not clutter my regular view.

#### Acceptance Criteria

1. WHEN the Checklist_State records all four Steps as `complete`, THE Dashboard SHALL stop rendering the Onboarding_Checklist on subsequent page loads.
2. WHEN the last Step transitions to `complete`, THE Onboarding_Checklist SHALL animate out of view before being removed from the DOM.
3. IF a Merchant's Checklist_State is missing from localStorage (e.g. cleared storage), THEN THE Onboarding_Checklist SHALL re-render with completion re-evaluated from the current session and transaction data.

---

### Requirement 6: Onboarding Checklist Data Model

**User Story:** As a developer, I want a typed Checklist_State model, so that the component and any persistence layer share a consistent, type-safe interface.

#### Acceptance Criteria

1. THE system SHALL define a `ChecklistState` TypeScript type with a field for each of the four Steps, each typed as `'incomplete' | 'complete'`.
2. THE system SHALL define a `ChecklistStep` TypeScript type with at minimum: `id` (string), `label` (string), `href` (string), and `status` (`'incomplete' | 'complete'`).
3. THE `ChecklistState` and `ChecklistStep` types SHALL be importable from a shared types module so that both the component and the persistence utilities use the same definitions.
4. FOR ALL valid `ChecklistState` objects serialized to JSON and deserialized back, THE system SHALL produce an equivalent `ChecklistState` object (round-trip property).
