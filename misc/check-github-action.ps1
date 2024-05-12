function Check-LatestGitHubActionRun {

    # Set the base URL for the GitHub API
    $url = "https://api.github.com/repos/theotherp/nzbhydra2/actions/runs"


    # Send a GET request to the GitHub API to retrieve the list of workflow runs
    $response = Invoke-RestMethod -Uri $url -Method Get

    # Get the latest workflow run
    $latestRun = $response.workflow_runs | Sort-Object -Property created_at -Descending | Select-Object -First 1

    # Check the status of the latest workflow run
    if ($latestRun.conclusion -eq "failure") {
        Write-Output "The latest GitHub Actions run for the repository $owner/$repo failed."
        exit 1
    } else {
        Write-Output "The latest GitHub Actions run for the repository $owner/$repo was successful."
    }
}

Check-LatestGitHubActionRun