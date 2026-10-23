**## Developer Information**

**Name**: Ram Andrei M. Manalo
**GitHub Username**: ramandrei
**Primary Technology Stack**: JavaScript with Express.js
**T10 Branch**: feature/t10-service-request-status
**## My T10 Implementation**

For T10, I implemented Service Request status management using the existing ServiceRequestRepository and a new ServiceRequestStatusService. The ServiceRequestStatusService is responsible for managing the allowed Service Request status transitions. The service first retrieves the existing Service Request from persistence using its ID and determines the current persisted status. It then checks whether the requested target status is one of the supported statuses and whether the transition from the current status is allowed. Valid transitions are passed to the repository. Invalid transitions are rejected before the repository update operation is called, so the persisted Service Request remains unchanged. After a successful transition, the updated Service Request is retrieved from persistence and returned by the service.

**## My Transition Rules**

The T10 implementation allows the following status transitions:

* Pending to In Progress
* Pending to Cancelled
* In Progress to Completed
* In Progress to Cancelled

Pending to Completed is rejected because a Service Request must first move to In Progress before it can become Completed. Completed is treated as a terminal status, so a Completed Service Request cannot move to another status. Cancelled is also treated as a terminal status and cannot move to another status. Same-status requests such as Pending to Pending are also rejected because T10 requires an actual status transition rather than assigning the same status again. Unsupported status values such as Approved or Rejected are rejected and do not modify the persisted Service Request.

**## Files I Changed**

- File: src/repositories/ServiceRequestRepository.js

- Purpose: Provides the persistence operation for updating the status of an existing Service Request and retrieving the updated record.

- File: src/services/ServiceRequestStatusService.js

- Purpose: Handles the status workflow by checking the current status, validating the requested status, determining whether the transition is allowed, and preventing invalid transitions from reaching persistence.

- File: test/serviceRequestStatusService.test.js

- Purpose: Contains automated tests that verify valid and invalid status transitions, terminal states, unsupported statuses, not-found Service Requests, persistence behavior, and preservation of Service Request information.

**## Problem I Encountered**

****Problem or error:****

I encountered some errors while creating and running the automated tests, especially when testing the different status transitions. I also had some difficulty handling the transition logic because I am not yet very familiar with some of the JavaScript syntax used in the implementation, and I can easily get confused when working with multiple conditions and status states.

****Cause:****

The errors were mainly caused by mistakes in the test setup and confusion when implementing and checking the different allowed and invalid status transitions. Since T10 introduced several possible status states and transition rules, it was sometimes difficult for me to keep track of which transitions should succeed and which should be rejected.

****How I resolved it:****

I resolved the issues by reviewing the test failures and comparing them with the required T10 transition rules. I checked each transition individually and adjusted the implementation and automated tests so that valid transitions were allowed while invalid transitions were rejected without modifying persistence. I also ran the test suite repeatedly and then ran the complete npm test suite to confirm that the final implementation worked correctly and did not break the previous tickets.

**## My Student-Designed Test**

****Test name:****

Service Request can complete through the full valid workflow

****What it verifies:****

The test verifies that a Service Request can move through the complete valid workflow from Pending to In Progress and then from In Progress to Completed. It also verifies that the final Completed status is actually stored in persistence and that the Service Request ID remains unchanged.

****Why I chose this scenario:****

I chose this scenario because T10 defines a sequence of related status transitions rather than isolated status changes. Testing the complete workflow helps verify that the application correctly handles sequential valid transitions and allows a Service Request to reach its terminal Completed state only through the required In Progress state.

**## Tools and References Used**

- Visual Studio Code
- Git and GitHub 
- Node.js
- SQLite / node:sqlite
- AI assistance (ChatGPT)
