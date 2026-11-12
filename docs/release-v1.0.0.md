# 1. RELEASE

**Application:** Community Services Management System  
**Release:** v1.0.0  
**Release Type:** Final Course Release

# 2. RELEASE SUMMARY

CSMS v1.0.0 is a web-based Community Services Management System developed to support resident information management and barangay service request processing. The system provides resident registration, record viewing, searching, updating, and deactivation. It also supports the submission, validation, monitoring, and controlled processing of service requests. The Dashboard presents operational information to help administrators monitor resident and service request activities. The application uses JavaScript, Node.js, Express.js, EJS, and SQLite, with automated tests covering its major functionality and integration between system responsibilities.

# 3. RESIDENT MANAGEMENT CAPABILITIES

The Resident Management module supports the registration and maintenance of resident records. Administrators can register new residents, view resident information, search and list records, and update existing information. The system validates resident data before accepting registration or updates. It also supports resident deactivation so that inactive residents are not treated as eligible for operations that require an active resident. Resident information is persisted through the application's database layer.

# 4. SERVICE REQUEST MANAGEMENT CAPABILITIES

The Service Request Management module allows eligible residents to submit service requests. Submitted requests are validated and stored in the database. Administrators can view, search, filter, and inspect service request records.

Service requests follow a controlled status workflow:

- **Pending** â€“ the request has been submitted and is awaiting processing.
- **In Progress** â€“ the request has been accepted for processing.
- **Completed** â€“ the request has been completed.

The system validates status changes and prevents invalid workflow transitions. Service request processing also considers resident eligibility, ensuring that the system does not treat an inactive resident as eligible to submit a request.

# 5. DASHBOARD CAPABILITIES

The Dashboard provides an operational overview of the Community Services Management System. It presents information relevant to resident management and service request activities, allowing administrators to monitor the system's records and current operations from a central interface.

# 6. QUALITY AND HARDENING

During T15, the system underwent release-readiness hardening. The work included handling malformed Resident IDs, validating unexpected persisted Service Request statuses, checking that read-only GET requests do not modify persisted data, testing resident deactivation against related service request functionality, and expanding invalid-input and numeric-boundary test coverage.

During T16, the application release version was updated to **1.0.0**. The package metadata serves as the version source, and the application configuration reuses that version for release information. The browser interface displays the version through the shared topbar. Automated application tests verify version consistency, and a new integration test verifies resident registration, service request submission, workflow processing, and persistence after reopening the database.

# 7. FINAL VERIFICATION

**Final Regression Run 1:** PASS

**Final Regression Run 2:** PASS

**Application Startup:** PASS

**/health:** PASS

**Dashboard:** PASS

**Resident Management:** PASS

**Service Request Management:** PASS

**Final Release Version:** 1.0.0

The latest recorded complete automated regression run reported **169 passing tests and 0 failures**.

# 8. KNOWN LIMITATIONS

No known release-blocking limitations remain within the defined CSMS v1.0.0 scope.
