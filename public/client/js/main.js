$(function(){

	var serverURL = "/comments/";

	var rootDiv = document.getElementById("comments");
	window.comments = rootDiv;

	rootDiv.templates = {
		comment: doT.template(document.getElementById('commentTmpl').text),
		replyForm: doT.template(document.getElementById('replyTmpl').text)
	};

	rootDiv.prepopulateReplyForm = function(replyForm)
	{
		replyForm.find("*[name]").filter(":input").each(function(i, elem){
			var elemName = $(elem).attr('name');
			if($.cookie(elemName))
				$(elem).val($.cookie(elemName));
		});
	}

	if(!window.guid) window.guid = function () {
    	var d = new Date().getTime();
    	var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    	    var r = (d + Math.random()*16)%16 | 0;
    	    d = Math.floor(d/16);
    	    return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    	});
    	return uuid;
	};

	rootDiv.sessionId = $.cookie('comment-session') || guid();
	$.cookie('comment-session', rootDiv.sessionId, {'path':'/'});
	
	rootDiv.elevationLevel = $.cookie('comment-elevation-level') || 0;
	$.cookie('comment-elevation-level', rootDiv.elevationLevel, {'path':'/'});

	rootDiv.onElevationLevelChanged = function() {
		rootDiv.elevationLevel = $.cookie('comment-elevation-level') || 0;

		$(rootDiv).toggleClass('admin', rootDiv.elevationLevel > 0);
	};

	var topLevelReplyForm = $(rootDiv.templates.replyForm());
	rootDiv.prepopulateReplyForm(topLevelReplyForm);
	topLevelReplyForm.on('click', 'input.submit', function(evt){
		rootDiv.submitReply($(evt.target).parents('.reply-form').first());
		evt.preventDefault();
	});
	$.data(topLevelReplyForm, 'parent-id', '');
	$(rootDiv).before(topLevelReplyForm);

	$(rootDiv).on('click', '.comment-reply', function(evt){
		var comment = $(evt.target).parents('.comment');
		if(comment.data('reply-form')) return;
		var replyForm = $(rootDiv.templates.replyForm());
		rootDiv.prepopulateReplyForm(replyForm);
		replyForm.data('parent-id', comment.data('comment-id'));
		replyForm.css('margin-left', comment.css('margin-left'));
		comment.data('reply-form', replyForm);
		comment.after(replyForm);
	});

	$(rootDiv).on('click', '.comment-delete', function(evt){
		var comment = $(evt.target).parents('.comment');
		rootDiv.deleteComment(comment.data('comment-id'));
	});

	$(rootDiv).on('click', '.reply-form .previewWrapper', function(evt){
		$(".preview", evt.target).toggle();
	});

	$(rootDiv).on('change keydown', '.reply-form textarea', function(evt){
		var form = $(evt.target).parents('.reply-form');
		$('.preview', form).html(markdown.toHTML($('textarea', form).val()));
	});

	rootDiv.baseUrl = "//" + document.location.hostname + document.location.pathname;

	function id(a) { return a }

	rootDiv.threading = new (function(){
		var self = this;
		self.topLevel = {};
		self.hierarchy = {};
		self.maxDepth = -1;
		self.scheme = "none";
		self.sort = function(a, b) { return $.data(a, 'timestamp') - $.data(b, 'timestamp') };
		self.rethreadTopLevel = function() {
			$.each($.map(self.topLevel, id).sort(self.sort), function(i, c){
				$(rootDiv).append($(c).detach().data('depth', 0));
				self.rethreadChildrenOf(c);
			})
		};
		self.rethreadChildrenOf = function(parent) {
			if(typeof(parent) == "string") parent = document.getElementById("comment-" + parent);
			var parentId = $.data(parent, 'comment-id');
			if(!(parentId in self.hierarchy)) return;
			var depth = Number($.data(parent, 'depth')) + 1;
			if(self.maxDepth >= 0) depth = Math.min(depth, self.maxDepth);
			var children = $.map(self.hierarchy[parentId], id);
			children.sort(self.sort);
			var promotedChild = self.selectPromotedChild(children, parent);
			$.each(children, function(i, c) { 
				$(c).toggleClass("linear-child", c == promotedChild);
				var effectiveDepth = (c == promotedChild) ? depth - 1 : depth;
				$(parent).after($(c).detach().data('depth', effectiveDepth).css('margin-left', (effectiveDepth*20)));
				if($.data(c, 'reply-form'))
					$(c).after($($.data(c, 'reply-form')).detach());
				self.rethreadChildrenOf(c);
			})
		};
		self.selectPromotedChild = function(comments, parent) {
			if(self.scheme == "none") return null;
			if(comments.length == 1) return comments[0];
			var parentAuthor = $(".attribution", parent).text();
			var grandparentAuthor = $("#comment-" + $.data(parent, "parent-id") + " .attribution").text();
			var promotedChild = null;
			 $.each(comments, function(i, c){
			 	var author = $(".attribution", c).text();
			 	if(author == parentAuthor || author == grandparentAuthor)
			 	{
			 		promotedChild = c;
			 		return false;
			 	}
			 	return true;
			 });
			 return promotedChild;
		}
		self.updateHierarchy = function(comment, elem) {
			if(comment.parent_id)
			{
				if(!(comment.parent_id in self.hierarchy))
					self.hierarchy[comment.parent_id] = {};
				self.hierarchy[comment.parent_id][comment.key] = elem;
			} else self.topLevel[comment.key] = elem;
		};
	})();

	$(rootDiv).on('click', 'input.submit', function(evt){
		rootDiv.submitReply($(evt.target).parents('.reply-form').first());
		evt.preventDefault();
	});

	rootDiv.onCommentUpdated = function(comment)
	{
		var divId = "comment-" + comment.key;
		var c = document.getElementById("comment-" + comment.key) || $('<div class="comment" id="comment-'+comment.key+'"></div>')[0];
		$(c).data('comment-id', comment.key)
		    .data('parent-id', comment.parent_id)
		    .html(rootDiv.templates.comment(comment))
		    .toggleClass('in-moderation', comment.status == "mod")
		    .toggleClass('unsynced', comment.sync == "push")
		    .toggleClass('deleted', comment.status == "del");

		rootDiv.threading.updateHierarchy(comment, c);
	};

	rootDiv.authenticateSession = function(attribution, credential)
	{
		$.ajax({url:serverURL + "session.php", 
				data:{'action':'authenticate', 'attribution':attribution, 'credential':credential}, 
				method:'POST',
				xhrFields: {
      				withCredentials: true
   				},
				success: function(c) { 
					$.cookie('comment-elevation-level', c.level, {path:'/'});
					window.comments.onElevationLevelChanged();
				},
				error: function(xhr, msg) {
					alert("Couldn't elevate session: " + msg);
				},
				dataType:"json"
		});
	};

	rootDiv.lastFetchTime = null;

	rootDiv.db = Lawnchair({name:'comments', record:'comment'}, function(db){

		db.after('save', function(c){
			rootDiv.onCommentUpdated(c);
			if(c.sync == 'push') rootDiv.sendPendingComments();
		})

		rootDiv.submitReply = function(postForm)
		{
			var comment = {};
			postForm.find("*[name]").filter(":input").each(function(i, elem){comment[$(elem).attr('name')] = $(elem).val()});
			$.cookie('attribution', comment.attribution);
			$.cookie('subscriber', comment.subscriber);
			comment.url = rootDiv.baseUrl;
			comment.parent_id = postForm.data('parent-id') || null,
			comment.sync = 'push';
			db.save(comment, function(c){
						rootDiv.onCommentUpdated(c);
						if(c.parent_id)
						{
							postForm.remove();
							rootDiv.threading.rethreadChildrenOf(document.getElementById('comment-'+c.parent_id));
						}
						else
							$('textarea', postForm).val('');
					});
		};

		rootDiv.deleteComment = function(commentId){
			db.get(commentId, function(c){
				c.status = "del";
				c.sync = "push";
				db.save(c, function(c){
					rootDiv.onCommentUpdated(c);
				});
			});
		}

		rootDiv.sendPendingComments = function(){
			db.all(function(all){
				for (var i = 0, l = all.length; i < l; i++) {
					if (all[i].sync == 'push') 
					{
						$.ajax({
							url:serverURL, 
							data:all[i], 
							method:'POST',
							success: function(c) { 
								c.sync = "synced";
								db.save(c);
							},
							error: function(xhr, msg) {
								console.error("Sync error: " + msg);
							},
							dataType:"json"
						});
					}
				}
			})
		};

		rootDiv.fetchNewComments = function(){
			var data = {url:rootDiv.baseUrl};
			if(rootDiv.lastFetchTime) data.since = rootDiv.lastFetchTime;
			$.ajax({
				url:serverURL,
				data:data,
				method:'GET',
				success: function( json ) {
					rootDiv.lastFetchTime = json.fetchTime;
					var rethreadTopLevel = false;
					$.each(json.comments, function(i, comment){
						comment.sync = "synced";
						db.save(comment);
						if(!comment.parent_id) rethreadTopLevel = true;
					});
					if(rethreadTopLevel)
						rootDiv.threading.rethreadTopLevel();
					else
						$.each(json.comments, function(i, comment){
							rootDiv.threading.rethreadChildrenOf(comment.parent_id);
						});
				},
				error: function(xhr, msg) {
					console.error("Error loading comments: " + msg);
				},
				dataType:"json"
			});
		};
		
		setInterval(rootDiv.sendPendingComments, 10000);

		db.all(function(objs){
			$.each(objs, function(i, comment){rootDiv.onCommentUpdated(comment)});
			rootDiv.threading.rethreadTopLevel();
			rootDiv.onElevationLevelChanged();
		});

		rootDiv.fetchNewComments();
		setInterval(rootDiv.fetchNewComments, 5000);
		
	});


});