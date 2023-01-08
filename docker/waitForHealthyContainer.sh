while [ "`docker container inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}undefined{{end}}' $1`" != "healthy" ]; do     sleep 1; done
