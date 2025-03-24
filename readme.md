<div id="top"></div>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h3 align="center">Rewards and Recognition API</h3>

  <p align="center">
    A comprehensive API for managing employee rewards and recognition
    <br />
    <a href="https://proactionca.ent.cgi.com/confluence/display/PHAUTODEV/API?preview=/265909183/265909184/API.pdf"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://proactionca.ent.cgi.com/confluence/display/PHAUTODEV/Backlogs">Backlogs</a>
    ·
    <a href="https://proactionca.ent.cgi.com/confluence/display/PHAUTODEV/Issues">Issues</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About The Project

The Rewards and Recognition API is a robust system designed to facilitate employee recognition and reward management. It provides a comprehensive set of endpoints for authentication, reward point submission, approval processes, and leaderboard management.

### Built With

[![NodeJS][Node.js]][Node-url]
[![Express][Express.js]][Express-url]

<!-- GETTING STARTED -->

## Getting Started

To get a local copy up and running follow these simple example steps.

### Prerequisites

_Step by Step guide for prerequisite installation_

- Node.js

  - Download and install Node.js LTS

- Install and update to npm latest

  ```sh
  npm install npm@latest -g
  ```

- Database
  - Download and Install Mysql server ([Mysql server](https://dev.mysql.com/downloads/windows/installer/8.0.html))
  - Start MYSQL
  - Import SQL Dumps to MYSQL server database from the models/dumps folder

### Installation

_Installation Setup_

1. Clone the repo

   ```sh
   git clone https://pacasource.ent.cgi.com/gitlab/apac/PHAUTODEV/rewards-and-recognition-backend
   ```

2. Install NPM packages

   ```sh
   npm install
   ```

3. Create `.env` file in the root folder and add required value key pair

   ```env
    DB_HOST_DEV=localhost
    DB_USER_DEV=<database_username>
    DB_PASS_DEV=<database_password>
    DB_PORT_DEV=<database_port>
    DB_NAME_DEV=cgi_rr
    CYPHER_LOGIN_IV=248, 100, 150, 44, 3, 32, 153, 140, 147, 5, 164, 217, 219, 26, 3, 108
    CYPHER_SECRET_KEY=vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3
    NODE_ENV="development"
    PORT=3001
    CLIENT_URL=http://localhost:4200

    LDAP_USER="CN=<your_cgi_username>,OU=Users,OU=PH,OU=Landlord MY,OU=Corporate,DC=groupinfra,DC=com"
    LDAP_PASSWORD=<your_cgi_password>

    # Nodemailer creadentials for production environment
    NODEMAILER_EMAIL=<NODEMAILER_EMAIL>
    NODEMAILER_USERNAME=<NODEMAILER_USERNAME>
    NODEMAILER_PASSWORD=<NODEMAILER_PASSWORD>
    NODEMAILER_HOST=<NODEMAILER_HOST>
    NODEMAILER_PORT=<NODEMAILER_PORT>

    # Email testers for development (Add email tester by adding ";" before another email)
    TESTER_EMAILS=jheremiah.magno@cgi.com;another@email.com
    TESTER_EMAILS_CC=jheremiah.magno@cgi.com;another@email.com
   ```

4. Initialize DB and Tables

   #### If you are using MySQL Workbench

   ```sh
    Create database schema named "cgi_rr"
    Use cgi_rr.sql under config folder to data import to cgi_rr schema in MySQL Workbench
   ```

   #### If you are using MySQL Command Line Client

   ```sh
   login your mysql credentials in command line
   run "source path:\\to_the_backend_folder\\config\\cgi_rr_script.sql"
   ```

5. In the project folder under config/
   ```
    cgi_rr.sql (sql file to be import)
    cgi_rr_script.sql (sql file to be execute in MySQL Command Line or any database tools)
   ```

<!-- USAGE EXAMPLES -->

## Usage

#### This is how a project can be used.

Start command for manual start

```sh
npm start
```

Start command for Development Environment

```sh
npm run dev
```

<!-- CONTACT -->

## Contact

Jeff Garcia - [jeff.garcia@cgi.com](jeff.garcia@cgi.com)

Project Link: [https://pacasource.ent.cgi.com/gitlab/apac/PHAUTODEV/rewards-and-recognition-backend](https://pacasource.ent.cgi.com/gitlab/apac/PHAUTODEV/rewards-and-recognition-backend)

<p align="right">(<a href="#top">back to top</a>)</p>

[Node.js]: https://img.shields.io/badge/Node.js-%23404d59.svg?style=for-the-badge&logo=Node.js
[Node-url]: https://nodejs.org/en/
[Express.js]: https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express
[Express-url]: https://www.npmjs.com/package/express
