<?php

require_once("lib/comment.php");
require_once("lib/db.php");

$db = new DB();
$db->connect();

$action = $_REQUEST["action"];
$sessionID = $_COOKIE["comment-session"];

switch($action)
{
    case "authenticate":
    {
        $credential = $_REQUEST["credential"];
        $owner = $_REQUEST["attribution"];

        $level = $db->authenticateSession($sessionID, $owner, $credential);
        header('Content-Type: application/json');
        print json_encode(array('level' => $level));

        break;
    }
}