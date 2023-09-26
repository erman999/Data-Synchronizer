# Data Synchronizer

Data Synchronizer is a Node.js Electron application that synchronizes MySQL/MariaDB data from client to server. The application uses Socket.io for connecting and emitting data, allowing for up to 5000 concurrent clients. The application structure involves clients connecting to the socket server through which they communicate with client-to-server or vice versa. The server receives the data and sends it to the client via data events.

## Screenshots
Here are some screenshots of the Data Synchronizer:

<br/>
<p align="center">Figure 1: Main screen of the Data Synchronizer Client</p>
<p align="center"><img src="https://raw.githubusercontent.com/erman999/Data-Synchronizer/master/screenshots/client.jpg" width="600"></p>

<br/>
<p align="center">Figure 2: Main screen of the Data Synchronizer Server</p>
<p align="center"><img src="https://raw.githubusercontent.com/erman999/Data-Synchronizer/master/screenshots/server.jpg" width="600"></p>

<br/>
<p align="center">Figure 3: Configuration screen of the Data Synchronizer Server</p>
<p align="center"><img src="https://raw.githubusercontent.com/erman999/Data-Synchronizer/master/screenshots/client-configs.jpg" width="600"></p>
<br/>

## Installation
1. Clone the repository to your local machine
2. Install the required dependencies
3. Configure the application to connect to your client and server databases

## Usage
1. Run the application to synchronize your data
2. Monitor the synchronization process for any errors or issues
3. Troubleshoot any errors or issues as needed

## Contributing
Contributions are welcome! If you find a bug or have a feature request, please open an issue on the GitHub repository. If you would like to contribute code, please fork the repository and submit a pull request.

## License
This project is licensed under the Apache-2.0 License - see the [LICENSE](LICENSE) file for details.
