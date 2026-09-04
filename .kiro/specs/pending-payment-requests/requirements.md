# Requirements Document

## Introduction

Merchants using the Aframp dashboard currently receive payment requests via the Stellar Horizon API,
but only the count of open requests is surfaced in the QuickConvert area. This feature adds a
dedicated Pending Payment Requests widget to the dashboard home page so merchants can see and act
on their open requests without navigating away. The widget displays up to 5 open requests with
key details, links each row to a dedicated request detail page at `/request/[id]`, and provides a
"View all" link when more than 5 open requests exist.

## Glossary

- **Dashboard**: The main page at `/dashboard` rendered by `DashboardContent`.
- **Payment_Request**: An open payment request fetched from the Stellar Horizon API, identified by a unique ID, with an amount, asset, and expiry timestamp.
- **Pending_Requests_Widget**: The dashboard UI component that lists open Payment_Requests.
- **Request_Detail_Page**: The Next.js page at `/request/[id]` that shows full details for a single Payment_Request.
- **Horizon_API**: The Stellar Horizon REST API used to fetch Payment_Requests for the merchant's wallet address.
- **Asset**: The Stellar asset code and issuer associated with a Payment_Request (e.g. USDC, cNGN).
- **Time_Remaining**: The human-readable countdown to expiry derived from the Payment_Request's expiry timestamp.

---

## Requirements

### Requirement 1: Fetch Open Payment Requests

**User Story:** As a merchant, I want the dashboard to load my open payment requests automatically, so that I always see up-to-date pending requests when I open the app.

#### Acceptance Criteria

1. WHEN the Dashboard is rendered with a valid wallet address, THE Horizon_API SHALL be queried for open Payment_Requests associated with that wallet address.
2. WHEN the Horizon_API returns a successful response, THE Pending_Requests_Widget SHALL display the returned Payment_Requests.
3. IF the Horizon_API returns an error, THEN THE Pending_Requests_Widget SHALL display an error message and provide a retry action.
4. WHILE a fetch is in progress, THE Pending_Requests_Widget SHALL display a loading skeleton in place of the request list.
5. THE Pending_Requests_Widget SHALL re-fetch open Payment_Requests without requiring a full page reload when the merchant triggers a manual refresh.

---

### Requirement 2: Display Pending Payment Requests List

**User Story:** As a merchant, I want to see my open payment requests on the dashboard home page, so that I can quickly identify which requests need attention.

#### Acceptance Criteria

1. THE Pending_Requests_Widget SHALL display a maximum of 5 Payment_Requests at one time.
2. WHEN a Payment_Request row is rendered, THE Pending_Requests_Widget SHALL display the amount, Asset, and Time_Remaining for that request.
3. WHEN the Horizon_API returns zero open Payment_Requests, THE Pending_Requests_Widget SHALL display an empty state message indicating no pending requests exist.
4. THE Pending_Requests_Widget SHALL render Payment_Requests ordered by ascending Time_Remaining so that the most urgent requests appear first.
5. WHEN a Payment_Request has expired (Time_Remaining reaches zero), THE Pending_Requests_Widget SHALL remove that row from the displayed list without requiring a page reload.

---

### Requirement 3: Navigate to Request Detail

**User Story:** As a merchant, I want to click a payment request row to view its full details, so that I can review and act on it.

#### Acceptance Criteria

1. WHEN a merchant clicks a Payment_Request row, THE Dashboard SHALL navigate to the Request_Detail_Page at `/request/[id]` for that Payment_Request.
2. THE Request_Detail_Page SHALL display the full details of the Payment_Request identified by the `id` route parameter.
3. IF the `id` route parameter does not match any known Payment_Request, THEN THE Request_Detail_Page SHALL display a not-found message and provide a link back to the Dashboard.

---

### Requirement 4: View All Link

**User Story:** As a merchant, I want a "View all" link when I have more than 5 open requests, so that I can access my full list without the dashboard becoming cluttered.

#### Acceptance Criteria

1. WHEN the total number of open Payment_Requests exceeds 5, THE Pending_Requests_Widget SHALL display a "View all" link below the request list.
2. WHEN a merchant clicks the "View all" link, THE Dashboard SHALL navigate to a page that lists all open Payment_Requests.
3. WHEN the total number of open Payment_Requests is 5 or fewer, THE Pending_Requests_Widget SHALL NOT render the "View all" link.

---

### Requirement 5: Payment Request Data Model and API Route

**User Story:** As a developer, I want a typed Payment_Request model and a Next.js API route that fetches open requests from the Horizon_API, so that the front-end has a stable, typed interface to consume.

#### Acceptance Criteria

1. THE system SHALL define a `PaymentRequest` TypeScript type with at minimum the fields: `id` (string), `amount` (string), `asset` (string), `expiresAt` (ISO 8601 string).
2. WHEN a GET request is made to `/api/payment-requests?address=[walletAddress]`, THE system SHALL return an array of open `PaymentRequest` objects for that wallet address.
3. IF the `address` query parameter is missing or empty, THEN THE system SHALL return a 400 status response with a descriptive error message.
4. IF the Horizon_API returns a non-success response, THEN THE system SHALL return a 502 status response with a descriptive error message.
5. THE `PaymentRequest` type SHALL be importable from a shared types module so that both the API route and client components use the same definition.
6. FOR ALL valid `PaymentRequest` objects serialized to JSON and deserialized back, THE system SHALL produce an equivalent `PaymentRequest` object (round-trip property).
