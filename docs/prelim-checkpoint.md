## Developer Information

**Name**: Ram Andrei M. Manalo
**GitHub Username**: ramandrei
**Primary Technology Stack**: JavaScript with Express.js
**T03 Branch**: feature/t03-resident-persistence

## My T03 Implementation

For T03, I implemented Resident persistence using SQLite and the Node.js node:sqlite module. The SQLite database is stored as a file under the project's src/database location, while the generated database file is excluded from Git using .gitignore. 

The ResidentRepository class handles Resident persistence through the save() and findById() methods. When save() is called, the Resident information is inserted into the SQLite residents table using an SQL statement. SQLite automatically generates the Resident ID through the table's auto-incrementing primary key, and the generated ID is obtained from the result of the insert operation and assigned to the Resident object. 

The findById() method uses an SQL query to search for a Resident using its ID and then converts the database row into a Resident object. If no matching record exists, findById() returns null instead of creating or returning an invalid Resident.

## My Persistence Design Decision

One persistence-related design decision I made was to keep the ResidentRepository responsible for database operations while keeping the existing Resident model focused on representing Resident information. I implemented it this way so that the model would not need to contain code related to SQLite. 

I also considered placing the database operations directly inside the Resident model, but that would mix responsibilities between the domain and model with persistence responsibilities. Keeping the repository separate makes the architecture easier to understand and allows the Resident model to remain independent from the database.

## My Database Initialization Design

**Database initialization file or module:** src/database/database.js

**Where the database path comes from:**
The database path is passed into the database setup code as a parameter, so the application and the automated tests can each use different database files without changing the code itself.

**How the Resident table is initialized:**
The database initialization executes a CREATE TABLE IF NOT EXISTS statement for the residents table.

**How repeated initialization is handled:**
The IF NOT EXISTS clause allows the initialization to run repeatedly without attempting to create a duplicate table.

I designed it this way so that database initialization is separated from the Express application and can be reused when the application starts. It also allows the automated tests to use temporary SQLite database files instead of modifying the normal development database.

## Files I Changed

- File: .gitignore
- Purpose: Prevents generated SQLite database files and other files from being committed to Git.

- File: src/repositories/ResidentRepository.js
- Purpose: Provides the persistence operations for saving Residents to SQLite and retrieving Residents by ID.

- File: src/database/database.js
- Purpose: Handles SQLite database setup, connection, and Resident table initialization.

- File: test/residentRepository.test.js
- Purpose: Contains automated tests that verify Resident persistence, generated IDs, retrieval, missing Residents, and persistence across separate repository instances.

## SQL I Can Explain

One SQL statement I wrote for T03 is:

INSERT INTO residents (
  first_name,
  last_name,
  address,
  contact_number,
  email,
  status
)
VALUES (?, ?, ?, ?, ?, ?)

This statement inserts a Resident into the residents table. The placeholders represent the Resident's first name, last name, address, contact number, email, and status respectively. The values are supplied through the prepared statement's run() method instead of being directly concatenated into the SQL statement. This SQL statement is used by the save() operation in ResidentRepository.js.

## My Resident Mapping

When findById() retrieves a Resident from SQLite, the database row is converted into an instance of the existing Resident model. The repository creates a new Resident and passes the retrieved values into its constructor. For example, the SQLite column first_name is mapped to the JavaScript property firstName. Similarly, last_name becomes lastName, and contact_number becomes contactNumber. This mapping allows the rest of the JavaScript application to continue using the existing Resident property names.

## Problem I Encountered

**Problem or error:**
The test for persistence across separate repository instances initially produced the error this.database.prepare is not a function.

**Cause:**
The test passed a database file path directly to ResidentRepository, but the repository constructor expected an already-open SQLite database connection. Therefore, this.database was not a SQLite database object and did not have the prepare() method.

**How I resolved it:**
I changed the test to create a SQLite DatabaseSync connection using the temporary database path and then passed that connection to ResidentRepository. I also made sure that the repository connections were closed before deleting the temporary database directory.

## My Student-Designed Test

**Test name:**
multiple residents can be persisted independently

**What it verifies:**
The test verifies that multiple Resident objects can be saved independently and that each Resident receives its own database-generated identifier and retains its own information.

**Why I chose this scenario:**
I chose this scenario because persistence should not only work for a single Resident. It should also correctly handle multiple records without overwriting or confusing their information. This test helps detect problems involving incorrect ID generation, incorrect SQL insertion, or accidentally returning the wrong Resident record.

## Tools and References Used
- Visual Studio Code — used to edit the JavaScript source code, database modules, and automated tests.
- Git and GitHub — used for version control, branching, committing, pushing, and Pull Request management.
- Node.js — used to run the application and automated tests.
- AI assistance (ChatGPT) — used to help understand the T03 requirements, troubleshoot errors, explain SQLite and repository concepts, and debug parts of the implementation.