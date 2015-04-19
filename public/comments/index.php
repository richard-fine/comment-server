<?php

require_once("lib/comment.php");
require_once("lib/db.php");

$db = new DB();
$db->connect();

switch($_SERVER['REQUEST_METHOD'])
{
	case "POST":
	{
		$comment = new Comment();
		$comment->setID($_POST["key"]);
		$comment->setContent($_POST["content"]);
		$comment->setURL($_POST["url"]);
		$comment->setParentID($_POST["parent_id"]);
		$comment->setAttribution($_POST["attribution"]);

		$db->upsertCommentAndRefresh($comment);

		if(isset($_POST["subscriber"]) && trim($_POST["subscriber"]) != "")
			$db->subscribeTo($comment->getURL(), $comment, $_POST["subscriber"], false);

		header('Content-Type: application/json');
		print CommentToJSON($comment);
		break;
	}

	case "GET":
	{
		header('Content-Type: application/json');
		$results = $db->getCommentsForUrl($_GET["url"]);
		print "[\n";
		$isFirst = true;
		while($results->next())
		{
			if(!$isFirst) print ",\n";
			$isFirst = false;
			print CommentToJSON($results);
		}
		print ']';
		break;
	}
}

$db->close();

?>