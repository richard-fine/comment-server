<?php

require_once("lib/comment.php");
require_once("lib/db.php");
require_once("lib/Savant3.php");

$db = new DB();
$db->connect();

$whatsnew = $db->getOutdatedSubscriptions();

$digests = array();

while($whatsnew->next())
{
	if(!array_key_exists($whatsnew->getSubscriber(), $digests))
		$digests[$whatsnew->getSubscriber()] = array();

	array_push($digests[$whatsnew->getSubscriber()], Comment::CopyFrom($whatsnew));

	$db->conn->query("UPDATE subscriptions SET updated = CURRENT_TIMESTAMP where id = " . $whatsnew->getSubscriptionID());
}

$db->close();

$tpl = new Savant3();

// TODO: Assign site-level parameters to $tpl here

foreach($digests as $subscriber => $activity)
{
	$tpl->to = $subscriber;
	$tpl->from = "noreply@example.com";
	$tpl->subject = "New replies to your comments";
	$tpl->comments = $activity;

	$notification = $tpl->fetch("templates/email-notification.tpl.php");

	mail($subscriber, "New replies to your comments", $notification);
}

?>