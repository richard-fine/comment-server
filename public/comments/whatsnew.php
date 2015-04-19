<?php

require_once("lib/comment.php");
require_once("lib/db.php");

$db = new DB();
$db->connect();

$whatsnew = $db->getOutdatedSubscriptions();

$digests = array();

while($whatsnew->next())
{
	if(!array_key_exists($whatsnew->getSubscriber(), $digests))
		$digests[$whatsnew->getSubscriber()] = array();

	array_push($digests[$whatsnew->getSubscriber()], Comment::CopyFrom($whatsnew));
}

$db->close();

foreach($digests as $subscriber => $activity)
{
	$to = $subscriber;
	$from = "noreply@example.com";
	$subject = "New replies to your comments at example.com";
	$body = "Hi,\r\n\r\n"
		  . "There are new replies to your comment:" . " :\r\n\r\n";

	foreach($activity as $comment)
	{
		$body .= $comment->getAttribution() . " wrote at " . $comment->getTimestamp() . ":\r\n";
//		$body .= "---\r\n\r\n";
		foreach(explode("\r\n", $comment->getContent()) as $line)
			$body .= "" . $line;
		$body .= "\r\n\r\n---------------\r\n\r\n";
	}

	echo "To: $to\nFrom: $from\nSubject: $subject\n\n$body";

	//mail($to, $subject, $body);


}

?>