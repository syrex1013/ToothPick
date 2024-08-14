# Define the server IP and port to connect to
$serverIP = "127.0.0.1"
$serverPort = 8080

function Connect-ToServer {
    while ($true) {
        try {
            # Create a TCP client
            $global:client = [System.Net.Sockets.TcpClient]::new($serverIP, $serverPort)
            $global:networkStream = $client.GetStream()
            $global:reader = [System.IO.StreamReader]::new($networkStream)
            $global:writer = [System.IO.StreamWriter]::new($networkStream)
            Write-Host "Connected to server!"
            return
        } catch {
            Write-Host "Failed to connect. Retrying in 10 seconds..."
            Start-Sleep -Seconds 10
        }
    }
}

# Function to handle incoming commands
function Handle-Commands {
    while ($true) {
        if ($client.Connected) {
            if ($networkStream.DataAvailable) {
                $command = $reader.ReadLine()
                # send back command value
                $writer.WriteLine($command)
                $writer.Flush()
                $client.Close()
            }
            Start-Sleep -Milliseconds 100
        } else {
            Write-Host "Disconnected from server. Attempting to reconnect..."
            Connect-ToServer
        }
    }
}

# Start handling commands
Connect-ToServer
Handle-Commands


# Cleanup
$reader.Close()
$writer.Close()
$networkStream.Close()
$client.Close()