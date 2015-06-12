if [ ! -f /var/log/databasesetup ];
then
    sleep 5s

    echo "CREATE DATABASE comments" | mysql -h 127.0.0.1 -uroot -proot
    echo "flush privileges" | mysql -h 127.0.0.1 -uroot -proot

    touch /var/log/databasesetup

    if [ -f /var/www/schema.sql ];
    then
        mysql -h 127.0.0.1 -uroot -proot comments < /var/www/schema.sql
    fi
fi