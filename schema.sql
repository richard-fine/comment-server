CREATE TABLE `comments` (
  `id` char(36) NOT NULL DEFAULT '',
  `url` varchar(512) CHARACTER SET utf8 NOT NULL DEFAULT '',
  `content` text CHARACTER SET utf8,
  `attribution` varchar(512) DEFAULT NULL,
  `parent_id` char(36) DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('ok','mod','del') NOT NULL DEFAULT 'ok',
  PRIMARY KEY (`id`),
  KEY `url` (`url`(255))
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `sessions` (
  `id` char(36) NOT NULL DEFAULT '',
  `level` tinyint(4) unsigned NOT NULL DEFAULT '0',
  `last_active` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `owner` varchar(512) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=MEMORY DEFAULT CHARSET=latin1;

CREATE TABLE `subscriptions` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `url` varchar(512) NOT NULL DEFAULT '',
  `subscriber` varchar(512) NOT NULL DEFAULT '',
  `comment_id` char(36) DEFAULT NULL,
  `updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `propagate` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`id`),
  KEY `url` (`url`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=latin1;

CREATE TABLE `users` (
  `attribution` varchar(512) NOT NULL DEFAULT '',
  `level` tinyint(4) unsigned NOT NULL DEFAULT '0',
  `credential` char(40) NOT NULL DEFAULT '',
  PRIMARY KEY (`attribution`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/* Create an 'admin' user with password 'test' */
INSERT INTO `users` (`attribution`, `level`, `credential`)
VALUES
    ('admin', 3, '331df91ee11de79a27d70882e395c0177d29f36b');
