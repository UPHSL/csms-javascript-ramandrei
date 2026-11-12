# 1. DEVELOPER INFORMATION

**Name:** Ram Andrei M. Manalo

**GitHub Username:** ramandrei

**Technology Stack:** JavaScript, Node.js, Express.js, EJS, SQLite, Supertest, and Node.js built-in test runner

**T16 Branch:** `feature/t16-final-release`

**Final Release Version:** 1.0.0

# 2. MY FINAL RELEASE IMPLEMENTATION

I established the CSMS release version in the project's `package.json` file, setting it to version 1.0.0. I chose the package metadata as the version source because it is already part of the Node.js project configuration and can be accessed by the application without maintaining another independent version value. The shared application configuration reads the package version and exposes it through `applicationConfig`. The `/health` endpoint uses the application's release information to report the current application version. The browser interface obtains the same application configuration through Express application locals and displays the version in the shared topbar. Using one version source avoids inconsistencies between the package metadata, health response, and browser interface. This implementation follows the existing JavaScript and Express.js architecture while reusing the application's shared configuration and EJS template structure.

# 3. FILES I CHANGED

The following files were changed or created during T16:

1. **`package.json`** â€“ Updated the application package version to 1.0.0.

2. **`package-lock.json`** â€“ Updated the lockfile metadata to match the package version.

3. **`src/config/application.js`** â€“ Updated the shared application configuration to obtain the version from the package metadata.

4. **`src/app.js`** â€“ Made the shared application configuration available to the Express application and its views.

5. **`src/views/partials/topbar.ejs`** â€“ Updated the shared browser interface to display the application version.

6. **`test/application.test.js`** â€“ Updated application tests to verify the health response and browser version against the package metadata.

7. **`test/finalReleaseIntegration.test.js`** â€“ Added a final integration test covering resident registration, service request submission, workflow processing, and persisted data after reopening the database.

8. **`docs/release-v1.0.0.md`** â€“ Created the official CSMS v1.0.0 release notes.

9. **`docs/final-checkpoint.md`** â€“ Created the T16 final development checkpoint.

# 4. MY FINAL EXAMINATION TEST

**Test Name:**  
T16 integration: registered resident can submit and complete a service request that remains persisted after reopening the database.

**Modules/Responsibilities Covered:**

- Resident model and validation
- Resident repository
- Resident registration service
- Service Request model and validation
- Service Request repository
- Service Request submission service
- Service Request status service
- SQLite database persistence

**Starting State:**

The integration test creates a temporary SQLite database with no existing resident or service request records. It verifies that the initial resident and service request counts are both zero.

**Operations Performed:**

1. Register a resident through the Resident Registration Service.
2. Verify that the resident is persisted.
3. Submit a Barangay Clearance Service Request for the registered resident.
4. Process the request through the valid status transitions: Pending, In Progress, and Completed.
5. Close the database connection.
6. Reopen the same database using fresh repository instances.
7. Retrieve the resident and service request records.
8. Verify the persisted information and final status.

**Expected Final State:**

The reopened database contains exactly one registered resident and one service request. The resident information remains available, and the service request retains its submitted information and Completed status.

**Why This Test Is Meaningful:**

This test provides stronger evidence than a simple isolated unit test because it verifies that several established system responsibilities work together. It exercises actual registration and service request operations instead of relying only on mocked data. It also verifies the controlled service request workflow and confirms that the final records remain persisted after the database is closed and reopened. This demonstrates that the integrated operations produce the expected result across multiple modules and the database persistence layer.

# 5. MY FINAL TECHNICAL DECISION

**Decision:**

I decided to use the project's `package.json` version as the single authoritative release-version source and reuse it through the shared application configuration.

**Alternative Considered:**

I could have placed the release version directly in the application configuration as a manually maintained string or separately hardcoded it in the health endpoint and browser template.

**Reason for My Decision:**

Using the package metadata avoids maintaining multiple copies of the same release version. If the application version changes in the future, the shared configuration will obtain the updated value from the package metadata. The health endpoint and browser interface can therefore report the same version without requiring separate manual updates. This approach also fits the existing Node.js and Express.js project structure.

# 6. PROBLEM OR VERIFICATION ISSUE ENCOUNTERED

**Problem:**

During the T16 browser interface update, I encountered a template verification concern involving the shared topbar. An earlier edit had an incomplete HTML structure, and the separator character also appeared incorrectly in the PowerShell terminal.

**Cause or Investigation:**

I inspected the complete `topbar.ejs` file and checked the opening and closing elements. I also reviewed the rendered text and the source to distinguish a terminal character-encoding display issue from an actual template problem.

**Resolution:**

I corrected the missing closing element and changed the separator to a standard pipe character. I retained the version display using the shared application configuration. I then checked the application JavaScript syntax, reviewed the Git diff for whitespace errors, and reran the automated test suite. The latest complete test run passed all 169 tests.

# 7. FINAL REGRESSION RESULTS

**Test Command:**

`npm test`

**Final Regression Run 1:** PASS

**Final Regression Run 2:** PASS

**Total Passing Tests Reported:** 169 in the latest recorded complete regression run, with 0 failures.

# 8. TOOLS AND REFERENCES USED

The following tools and resources were used during T16:

- **Node.js** â€“ Application runtime and built-in test runner.
- **JavaScript** â€“ Application configuration, integration testing, and system implementation.
- **Express.js** â€“ Web application framework.
- **EJS** â€“ Browser interface templates.
- **SQLite** â€“ Persistent database used by the application and integration test.
- **Supertest** â€“ HTTP-level application testing.
- **Git** â€“ Version control and change review.
- **GitHub** â€“ Repository and release workflow.
- **Existing CSMS repository documentation** â€“ Reference for the established system architecture, functionality, and previous development tasks.
- **Visual Studio Code / PowerShell** â€“ Development environment and command-line verification.
- **ChatGPT (OpenAI)** â€“ AI assistance for code review and troubleshooting.

# 9. FINAL RELEASE DECLARATION

**CSMS v1.0.0 - READY FOR RELEASE**
