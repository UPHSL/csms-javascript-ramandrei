# T15 – System Hardening and Release Readiness

## 1. Developer Information

- **Name**: Ram Andrei M. Manalo
- **GitHub Username**: ramandrei
- **Primary Technology Stack**: JavaScript with Express.js
- **T15 Branch:** `feature/t15-system-hardening`

## 2. Baseline Verification

Before implementing T15 hardening changes, the existing application and T01–T14 functionality were checked.

The following baseline activities were completed:

- Updated the local main branch.
- Confirmed that the working tree was clean before starting T15.
- Confirmed that the application could start.
- Checked the `/health` endpoint.
- Checked the Dashboard, Resident Management, and Service Request modules.
- Confirmed that the existing test suite passed before beginning hardening.

**Baseline Result:** Passed.

## 3. Hardening Changes

| Area | Issue or Risk Found | Action Taken | Files Changed | Test/Evidence |
|---|---|---|---|---|
| Input Validation | Resident identifiers containing malformed characters or invalid numeric values could be interpreted incorrectly. | Added strict Resident ID parsing using a positive-integer format and safe-integer validation. Invalid identifiers are rejected. | Resident controller; `test/residentInterface.test.js` | **PASS** – Malformed identifiers return HTTP 404 without modifying resident records. |
| Lifecycle and Persistence Integrity | An unexpected persisted Service Request status could cause an error when checking allowed status transitions. | Added a defensive check to ensure that the current status has a valid set of allowed transitions before attempting an update. | Service Request status service; `test/serviceRequestStatusService.test.js` | **PASS** – An unexpected status is rejected, and the persisted record remains unchanged. |
| HTTP and Mutation Safety | Read-only GET requests must not unintentionally modify Service Request records. | Added persistence snapshot assertions before and after multiple list, search, filter, form, and detail GET requests. | `test/serviceRequestInterface.test.js` | **PASS** – All tested GET requests preserve the original persisted records. |
| Cross-Feature Regression | A Resident deactivation operation must remain consistent across Resident Management, persistence, and Dashboard metrics. | Added an integration-level test that performs deactivation through the actual HTTP route and verifies the resulting records and dashboard counts. | `test/dashboard.test.js` | **PASS** – Resident status, management display, persistence, and dashboard metrics remain consistent. |
| Repeatability and Boundary Validation | Invalid and out-of-range Resident identifiers must be rejected consistently, including when the same request is repeated. | Added repeated boundary tests for zero, negative, decimal, leading-zero, and unsafe integer identifiers. | `test/residentInterface.test.js` | **PASS** – All invalid identifiers are consistently rejected, and the original resident record remains unchanged. |

## 4. Five New T15 Hardening Tests

### Test 1: Malformed Resident Identifier Rejection

**Category:** Input Validation and HTTP Safety

**What It Verifies:**  
Verifies that malformed Resident identifiers are rejected when accessing the edit page, submitting an update, or attempting to deactivate a resident. The test checks that these requests return HTTP 404 and do not modify the existing resident record or resident count.

**Why It Adds Value Beyond Existing Tests:**  
Existing tests verify normal Resident operations and valid identifiers. This test adds protection against malformed identifiers that may otherwise be incorrectly interpreted by the application.

**Result:** PASS

### Test 2: Unexpected Persisted Service Request Status

**Category:** Lifecycle and Persistence Integrity

**What It Verifies:**  
Verifies that the Service Request status update service safely handles an unexpected persisted status, such as `Archived`. The service must reject the requested transition and preserve the original database record.

**Why It Adds Value Beyond Existing Tests:**  
Existing tests cover valid and invalid status transitions based on recognized statuses. This test covers an unexpected database value that is outside the application's defined status lifecycle.

**Result:** PASS

### Test 3: Read-Only GET Persistence Integrity

**Category:** HTTP Safety and Persistence Integrity

**What It Verifies:**  
Verifies that GET requests to the Service Request list, search, filter, submission form, and detail pages do not change persisted Service Request records. The test compares the complete records before and after each request.

**Why It Adds Value Beyond Existing Tests:**  
Existing interface tests verify that pages load and display the expected information. This test additionally verifies that read-only operations do not produce unintended database changes.

**Result:** PASS

### Test 4: Resident Deactivation Cross-Feature Regression

**Category:** Cross-Feature Regression and Integration Testing

**What It Verifies:**  
Verifies the complete Resident deactivation workflow through the actual HTTP route. It checks the redirect response, Resident Management display, persisted Resident status, and updated Dashboard totals for total, active, and inactive residents.

**Why It Adds Value Beyond Existing Tests:**  
Existing tests may verify individual services or dashboard calculations independently. This test verifies that multiple application components remain consistent after one actual user operation.

**Result:** PASS

### Test 5: Repeated Invalid Resident Identifier and Numeric Boundary Testing

**Category:** Repeatability and Boundary Testing

**What It Verifies:**  
Verifies that invalid Resident identifiers, including `0`, `-1`, `1.0`, `01`, and `9007199254740992`, are consistently rejected across edit, update, and deactivation requests. Each invalid identifier is tested twice. The test also confirms that the original resident record and resident count remain unchanged.

**Why It Adds Value Beyond Existing Tests:**  
Existing tests cover ordinary invalid requests. This test expands coverage to numeric boundaries, unsafe integers, leading zeros, and repeated requests to verify consistent behavior.

**Result:** PASS

## 5. Regression Testing Results

The complete automated test suite was executed twice consecutively after implementing all five T15 hardening tests.

| Regression Run | Execution | Result |
|---|---|---|
| Run 1 | First complete `npm test` execution | **PASS** |
| Run 2 | Second consecutive complete `npm test` execution | **PASS** |

Both executions completed successfully without reported test failures.

## 6. Manual Testing Matrix

The following manual verification scenarios were completed.

| Test Scenario | Expected Result | Actual Result | Status |
|---|---|---|---|
| Application startup | Application starts without errors. | Application started successfully. | **PASS** |
| Health endpoint | `/health` responds successfully. | Endpoint responded successfully. | **PASS** |
| Dashboard access | Dashboard loads and displays the expected information. | Dashboard loaded successfully. | **PASS** |
| Resident Management | Resident records and statuses are displayed correctly. | Resident Management worked as expected. | **PASS** |
| Resident registration | Valid Resident information can be registered. | Registration worked as expected. | **PASS** |
| Resident update | Valid Resident information can be updated. | Update worked as expected. | **PASS** |
| Resident deactivation | Resident can be deactivated and the status is reflected correctly. | Deactivation worked as expected. | **PASS** |
| Service Request submission | A valid Service Request can be submitted. | Submission worked as expected. | **PASS** |
| Service Request listing | Existing Service Requests are displayed correctly. | Listing worked as expected. | **PASS** |
| Service Request search and filtering | Search and status filters return the expected records. | Search and filtering worked as expected. | **PASS** |
| Service Request details | Individual Service Request details are accessible. | Detail pages worked as expected. | **PASS** |
| Service Request status update | Valid status transitions are processed correctly. | Status updates worked as expected. | **PASS** |
| Invalid input handling | Invalid identifiers and malformed requests are rejected safely. | Invalid requests were rejected as expected. | **PASS** |
| Navigation and page access | Existing application pages and navigation work correctly. | Navigation worked as expected. | **PASS** |

## 7. Repository Hygiene

**Result: PASS**

The following have been completed before committing the T15 changes:

- Confirm the active branch is `feature/t15-system-hardening`.
- Review `git status` and verify all intended changes.
- Run `git diff --check` to identify whitespace errors.
- Review `git diff --stat` and inspect the complete changes.
- Verify that no credentials, environment files, temporary files, generated databases, or unrelated changes are included.
- Confirm that `docs/t15-release-readiness.md` is included.

## 8. Known Limitations

No known release-blocking limitations identified within the defined CSMS scope.

## 9. Release Readiness Status

**READY FOR T16 FINAL EXAM**
