<?php

class DB
{
	public $conn;

	public function connect()
	{
		mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
		$this->conn = mysqli_connect("localhost", "root", "root", "comments");
	}

	public function updateComment(IComment $comment)
	{
		$stmt = $this->conn->prepare("UPDATE comments SET url = ?, content = ?, attribution = ?, parent_id = ?, status = ?, timestamp = CURRENT_TIME WHERE id = ?");

		$id = $comment->getID();
		$url = $comment->getURL();
		$content = $comment->getContent();
		$attribution = $comment->getAttribution();
		$parentID = $comment->getParentID();
		$status = $comment->getStatus();

		$stmt->bind_param("ssssss", $url, $content, $attribution, $parentID, $status, $id);
		$stmt->execute();

		list($matched, $changed, $warnings) = sscanf($this->conn->info, "Rows matched: %d Changed: %d Warnings: %d");
		$stmt->close();
		return $matched > 0;
	}

	private function onNewComment(IComment $comment)
	{
		// Propagate subscriptions
		$stmt = $this->conn->prepare("INSERT INTO subscriptions (url, subscriber, comment_id, updated, propagate) SELECT url, subscriber, ?, updated, 1 FROM subscriptions WHERE comment_id = ? AND propagate = 1");
		$id = $comment->getID();
		$parentId = $comment->getParentID();
		$stmt->bind_param("ss", $id, $parentId);
		$stmt->execute();
	}

	public function upsertCommentAndRefresh(IComment &$comment)
	{
		$id = $comment->getID();

		$this->conn->begin_transaction();
		if(!$this->updateComment($comment))
		{
			$stmt = $this->conn->prepare("INSERT INTO comments(id, url, content, attribution, parent_id) VALUES (?, ?, ?, ?, ?)");

			$url = $comment->getURL();
			$content = $comment->getContent();
			$attribution = $comment->getAttribution();
			$parentID = $comment->getParentID();
			$stmt->bind_param("sssss", $id, $url, $content, $attribution, $parentID);
			$stmt->execute();
			$stmt->close();

			$this->onNewComment($comment);
		}
		$this->conn->commit();

		$comment = $this->getSingleComment($id);
	}

	public function getSingleComment($id)
	{
		$stmt = $this->conn->prepare("SELECT * FROM comments WHERE id = ?");
		$stmt->bind_param("s", $id);
		$stmt->execute();

		$result = new CommentSet($stmt->get_result());
		$result->next();
		return $result;
	}

	public function getCommentsForUrl($url)
	{
		$stmt = $this->conn->prepare("SELECT * FROM comments WHERE url = ?");
		$stmt->bind_param("s", $url);
		$stmt->execute();

		return new CommentSet($stmt->get_result());
	}

	public function getActivityAtUrlSinceTime($url, $timestamp)
	{
		$stmt = $this->conn->prepare("SELECT * FROM comments WHERE url = ? AND timestamp >= ?");
		$stmt->bind_param("ss", $url, $timestamp);
		$stmt->execute();

		return new CommentSet($stmt->get_result());
	}

	public function getOutdatedSubscriptions()
	{
		$stmt = $this->conn->prepare("SELECT subscriptions.id as subscriptionID, subscriber, comments.* FROM subscriptions, comments WHERE comments.timestamp > subscriptions.updated AND ((subscriptions.comment_id IS NULL AND subscriptions.url = comments.url) OR subscriptions.comment_id = comments.parent_id) ORDER BY comments.timestamp");
		$stmt->execute();

		return new SubscriptionCommentSet($stmt->get_result());
	}

	public function subscribeTo($url, $comment, $subscriber, $propagate)
	{
		$stmt = $this->conn->prepare("INSERT INTO subscriptions (url, subscriber, comment_id, propagate) VALUES (?, ?, ?, ?)");

		$commentId = isset($comment) ? $comment->getID() : NULL;
		$stmt->bind_param("sssi", $url, $subscriber, $commentId, $propagate);
		$stmt->execute();
	}

	public function close()
	{
		$this->conn->close();
	}

	public function authenticateSession($sessionId, $owner, $credential)
	{
		$stmt = $this->conn->prepare("INSERT INTO sessions (id, level, owner) (SELECT ? as id, level, attribution from users WHERE attribution = ? and credential = ?) on duplicate key update level = VALUES(level)");

		$hashed_credential = sha1($owner . ":" . $credential);
		$stmt->bind_param("sss", $sessionId, $owner, $hashed_credential);
		$stmt->execute();
		$stmt->close();
		
		return $this->getSessionLevel($sessionId);
	}

	public function getSessionLevel($sessionId)
	{
		$stmt = $this->conn->prepare("SELECT level FROM sessions WHERE id = ?");
		$stmt->bind_param("s", $sessionId);
		$stmt->execute();
		$stmt->store_result();

		$result = 0;
		if($stmt->num_rows > 0)
		{
			$stmt->bind_result($result);
			$stmt->fetch();
		}
		$stmt->close();
		return $result;
	}
}

?>