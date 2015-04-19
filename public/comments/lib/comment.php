<?php

interface IComment
{
	public function getID();
	public function getContent();
	public function getAttribution();
	public function getURL();
	public function getParentID();
	public function getTimestamp();
	public function getStatus();
}

class Comment implements IComment
{
	private $ID, $content, $attribution, $url, $parentID, $status, $timestamp;

	public function getID() { return $this->ID; }
	public function setID($id) { $this->ID = $id; }

	public function getContent() { return $this->content; }
	public function setContent($content) { $this->content = $content; }

	public function getAttribution() { return $this->attribution; }
	public function setAttribution($attribution)
	{
		$attribution = trim($attribution);
		if($attribution == "") $attribution = "Anonymous";
		$this->attribution = $attribution;
	}

	public function getURL() { return $this->url; }
	public function setURL($url) { $this->url = $url; }

	public function getParentID() { return $this->parentID; }
	public function setParentID($parentID) { $this->parentID = $parentID; }

	public function getTimestamp() { return $this->timestamp; }
	public function setTimestamp($timestamp) { $this->timestamp = $timestamp; }

	public function getStatus() { return $this->status; }
	public function setStatus($status) { $this->status = $status; }

	function __construct() {
		$this->setAttribution("");
	}

	public static function CopyFrom(IComment $other)
	{
		$result = new Comment();
		$result->setID($other->getID());
		$result->setContent($other->getContent());
		$result->setAttribution($other->getAttribution());
		$result->setURL($other->getURL());
		$result->setParentID($other->getParentID());
		$result->setTimestamp($other->getTimestamp());
		$result->setStatus($other->getStatus());
		return $result;
	}
}

class CommentSet implements IComment
{
	private $res;
	protected $current;

	public function getID() { return $this->current["id"]; }
	public function getContent() { return $this->current["content"]; }
	public function getAttribution() { return $this->current["attribution"]; }
	public function getURL() { return $this->current["url"]; }
	public function getParentID() { return $this->current["parent_id"]; }
	public function getTimestamp() { return $this->current["timestamp"]; }
	public function getStatus() { return $this->current["status"]; }

	function __construct($res)
	{
		$this->res = $res;
		$this->current = NULL;
	}

	public function next() {
		$this->current = $this->res->fetch_assoc();
		return ($this->current != NULL);
	}
}

class SubscriptionCommentSet extends CommentSet
{
	public function getSubscriptionID() { return $this->current["subscriptions.id"]; }
	public function getSubscriber() { return $this->current["subscriber"]; }
}

function CommentToJSON(IComment $comment)
{
	return json_encode(array('key' => $comment->getID(),
							 'url' => $comment->getURL(),
							 'content' => $comment->getContent(),
							 'attribution' => $comment->getAttribution(),
							 'parent_id' => $comment->getParentID(),
							 'timestamp' => $comment->getTimestamp(),
							 'status' => $comment->getStatus()
							 ));
}

?>