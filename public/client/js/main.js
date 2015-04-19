$(function(){

	var serverURL = "/comments/";

	var rootDiv = document.getElementById("comments");
	window.comments = rootDiv;

	rootDiv.templates = {
		comment: doT.template(document.getElementById('commentTmpl').text),
		replyForm: doT.template(document.getElementById('replyTmpl').text)
	};

	var topLevelReplyForm = $(rootDiv.templates.replyForm());
	topLevelReplyForm.on('click', 'input.submit', function(evt){
		rootDiv.submitReply($(evt.target).parents('.reply-form').first());
		evt.preventDefault();
	});
	$.data(topLevelReplyForm, 'parent-id', '');
	$(rootDiv).before(topLevelReplyForm);

	$(rootDiv).on('click', '.comment-reply', function(evt){
		var comment = $(evt.target).parents('.comment');
		var replyForm = $(rootDiv.templates.replyForm());
		replyForm.data('parent-id', comment.data('comment-id'));
		replyForm.css('margin-left', comment.css('margin-left'));
		comment.after(replyForm);
	});

	rootDiv.baseUrl = "//" + document.location.hostname + document.location.pathname;

	function id(a) { return a }

	rootDiv.threading = new (function(){
		var self = this;
		self.topLevel = {};
		self.hierarchy = {};
		self.maxDepth = -1;
		self.sort = function(a, b) { return $.data(a, 'timestamp') - $.data(b, 'timestamp') };
		self.rethreadTopLevel = function() {
			$.each($.map(self.topLevel, id).sort(self.sort), function(i, c){
				$(rootDiv).append($(c).detach().data('depth', 0));
				self.rethreadChildrenOf(c);
			})
		};
		self.rethreadChildrenOf = function(parent) {
			var parentId = $.data(parent, 'comment-id');
			if(!(parentId in self.hierarchy)) return;
			var depth = Number($.data(parent, 'depth')) + 1;
			if(self.maxDepth >= 0) depth = Math.min(depth, self.maxDepth);
			var children = $.map(self.hierarchy[parentId], id);
			children.sort(self.sort);
			$.each(children, function(i, c) { 
				$(parent).after($(c).detach().data('depth', depth).css('margin-left', (depth*20)));
				self.rethreadChildrenOf(c);
			})
		};
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
		    .toggleClass('unsynced', comment.sync == "push");

		rootDiv.threading.updateHierarchy(comment, c);
	};

	rootDiv.db = Lawnchair({name:'comments', record:'comment'}, function(db){

		db.after('save', function(c){
			rootDiv.onCommentUpdated(c);
			if(c.sync == 'push') rootDiv.sendPendingComments();
		})

		rootDiv.submitReply = function(postForm)
		{
			var comment = {};
			postForm.find("*[name]").filter(":input").each(function(i, elem){comment[$(elem).attr('name')] = $(elem).val()});
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

		rootDiv.fetchInitialComments = function(){
			$.ajax({
				url:serverURL,
				data:{url:rootDiv.baseUrl},
				method:'GET',
				success: function( json ) {
					$.each(json, function(i, comment){
						comment.sync = "synced";
						db.save(comment);
					});
					rootDiv.threading.rethreadTopLevel();
				},
				error: function(xhr, msg) {
					console.error("Error loading comments: " + msg);
				},
				dataType:"json"
			});
		};
		
		//setInterval(rootDiv.sendPendingComments, 10000);

		db.all(function(objs){
			$.each(objs, function(i, comment){rootDiv.onCommentUpdated(comment)});
			rootDiv.threading.rethreadTopLevel();
		});

		rootDiv.fetchInitialComments();
		
	});


});