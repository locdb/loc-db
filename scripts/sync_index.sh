SYSTEM=$1
echo "Sync search index for env" $SYSTEM
read -p "Are you sure? " -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Doing dangerous stuff"
	if [ $SYSTEM = "dev" ] || [ $SYSTEM = "development" ]; then
		DB="locdb-dev"
		APP1="loc-db-development"
		APP2="loc-db-jobs-development"
	elif [ $SYSTEM = "prod" ] || [ $SYSTEM = "production" ]; then
		DB="locdb-prod"
		APP1="loc-db-production"
		APP2="loc-db-jobs-production"
	elif [ $SYSTEM = "demo" ]; then
		DB="locdb-demo"
		APP1="loc-db-demo"
		APP2="loc-db-jobs-demo"
    elif [ $SYSTEM = "tue" ]; then
        DB="locdb-tue"
        APP1="loc-db-tuebingen"
        APP2="loc-db-jobs-tuebingen"
	fi
	INDEX="${DB}_br"
	echo "Dropping index" $INDEX
	curl -XDELETE localhost:9200/"$INDEX"
	pm2 restart "$APP1"
	pm2 restart "$APP2"
fi
echo "Exiting"