Vue.view("wiki-article-container", {
	services: ["swagger"],
	category: "Wiki",
	name: "Wiki Article",
	description: "Display a wiki article",
	icon: "images/views/wiki.png",
	props: {
		path: {
			type: String,
			required: true
		}
	},
	data: function() {
		return {
			content: null,
			items: [],
			showInline: false,
			lastLoadedInline: null
		}	
	},
	activate: function(done) {
		console.log("loading article", this.path);
		var self = this;
		this.$services.swagger.execute("nabu.documentation.wiki.rest.wiki.read", {
			path: this.path,
			contentType: "text/html"
		}).then(function(content) {
			var stringified = "" + content;
			var lowercase = stringified.toLowerCase();
			var findPlain = function(all, part, offset) {
				if (!offset) {
					offset = 0;
				}
				var index = all.indexOf(part, offset);
				if (index >= 0) {
					var substring = all.substring(0, index);
					var amountOfOpening = substring.length - substring.replace(/</g, "").length;
					var amountOfClosing = substring.length - substring.replace(/>/g, "").length;
					
					// we don't want hits within a header element
					var lastElement = all.lastIndexOf("<", index);
					if (lastElement >= 0 && all.substring(lastElement + 1, lastElement + 3).match(/h[0-9]+/)) {
						return findPlain(all, part, index + 1);
					}
					else if (amountOfClosing == amountOfOpening) {
						return index;
					}
					else {
						return findPlain(all, part, index + 1);
					}
				}
				return -1;
			}
			// inject the explainers
			Object.keys(self.$services.wiki.explainers).forEach(function(explainer) {
				var index = findPlain(lowercase, explainer);
				if (index >= 0) {
					stringified = stringified.substring(0, index) + "<span class='match-explainer' explain='" + explainer + "'>"
						+ stringified.substring(index, index + explainer.length) + "</span>"
						+ stringified.substring(index + explainer.length);
					lowercase = stringified.toLowerCase();
				}
			});
			// inject the tags
			Object.keys(self.$services.wiki.tags).forEach(function(tag) {
				var index = findPlain(lowercase, tag);
				if (index >= 0) {
					stringified = stringified.substring(0, index) + "<span class='match-tag' tag='" + tag + "'>"
						+ stringified.substring(index, index + tag.length) + "</span>"
						+ stringified.substring(index + tag.length);
					lowercase = stringified.toLowerCase();
				}
			});
			Vue.set(self, "content", stringified);
			done();
		});
	},
	ready: function() {
		if (!navigator.userAgent.match(/Nabu-Renderer/)) {
			this.$services.wiki.selected = this.path;
			// replace the links with handlers!
			var links = this.$el.querySelectorAll("a.internal");
			var self = this;
			var clicker = function(href) {
				var path = href.replace(/.*?\?path=(.*)$/, "$1");
				return function(event) {
					self.$services.router.route("wiki-article", { path: path });
				}
			};
			var addEvents = function(icon, path) {
				if (path == self.path) {
					return false;
				}
				else if (path instanceof Array && path.indexOf(self.path) >= 0) {
					path.splice(path.indexOf(self.path), 1);
					if (path.length == 1) {
						path = path[0];
					}
					else if (path.length == 0) {
						return false;
					}
				}
				icon.onmouseover = function(event) {
					var bounds = self.$el.getBoundingClientRect();
					
					var x = (event.clientX - bounds.left) + self.$el.scrollLeft;
					var y = (event.clientY - bounds.top) + self.$el.scrollTop;
					
					self.$refs.inline.setAttribute("style", "top:" + y + "px;left:" + x + "px");
					if (path instanceof Array && path.length == 1) {
						path = path[0];
					}
					var appendClose = function() {
						var span = document.createElement("span");
						span.setAttribute("class", "fa fa-times close-inline");
						span.onclick = function() {
							self.showInline = false;
						}
						self.$refs.inline.appendChild(span);
					}
					// if there are multiple paths, we just suggest them as interesting reading
					if (path instanceof Array) {
						self.resetInlineContent();
						self.$refs.inline.innerHTML = "<div class='read-more'><span class='read-more-title'>%{Read more}</span></div>";
						var list = document.createElement("ul");
						list.setAttribute("class", "read-more-list");
						self.$refs.inline.appendChild(list);
						path.forEach(function(single) {
							var li = document.createElement("li");
							list.appendChild(li);
							var a = document.createElement("a");
							a.innerHTML = single.replace(/^[/]+/, "").replace(/\.[^.]+$/, "").replace(/[/]+/g, " > ");
							a.onclick = function() {
								self.$services.router.route("wiki-article", { path : single });
							}
							li.appendChild(a);
						});
						self.showInline = true;
						appendClose();
					}
					// otherwise we provide a live view
					else if (self.lastLoadedInline != path) {
						self.resetInlineContent();
						self.lastLoadedInline = path;
						self.$services.swagger.execute("nabu.documentation.wiki.rest.wiki.read", {
							path: path,
							contentType: "text/html"
						}).then(function(content) {
							self.showInline = true;
							self.$refs.inline.innerHTML = content;
							var readOriginal = document.createElement("a");
							readOriginal.setAttribute("class", "read-original");
							readOriginal.onclick = function() {
								self.$services.router.route("wiki-article", { path: path });
							};
							readOriginal.innerHTML = "%{Go to this article} <span class='fa fa-chevron-right'></span>";
							self.$refs.inline.insertBefore(readOriginal, self.$refs.inline.firstChild);
							appendClose();
						});
					}
					else {
						self.showInline = true;
					}
				};
				return true;
			};
			var appendAfter = function(icon, after) {
				if (!after.nextSibling) {
					after.parentNode.appendChild(icon);
				}
				else {
					after.parentNode.insertBefore(icon, after.nextSibling);
				}
			}
			for (var i = 0; i < links.length; i++) {
				var href = links[i].getAttribute("href");
				links[i].setAttribute("href", "javascript:void(0)");
				links[i].addEventListener("click", clicker(href));
				var icon = document.createElement("span");
				icon.setAttribute("class", "fa fa-eye");
				if (addEvents(icon, href.replace(/.*?\?path=(.*)$/, "$1"))) {
					appendAfter(icon, links[i]);
				}
			}
			
			var externalLinks = this.$el.querySelectorAll("a.external");
			for (var i = 0; i < externalLinks.length; i++) {
				externalLinks[i].setAttribute("target", "_blank");	
			}
			
			var explainers = this.$el.querySelectorAll("span.match-explainer");
			for (var i = 0; i < explainers.length; i++) {
				var paths = this.$services.wiki.explainers[explainers[i].getAttribute("explain")].map(function(x) { return x.path });
				var icon = document.createElement("span");
				icon.setAttribute("class", "fa fa-info-circle");
				if (addEvents(icon, paths)) {
					explainers[i].parentNode.insertBefore(icon, explainers[i]);
				}
			}
			
			var tags = this.$el.querySelectorAll("span.match-tag");
			for (var i = 0; i < tags.length; i++) {
				var paths = this.$services.wiki.tags[tags[i].getAttribute("tag")].map(function(x) { return x.path });
				var icon = document.createElement("span");
				icon.setAttribute("class", "fa fa-tag");
				if (addEvents(icon, paths)) {
					tags[i].parentNode.insertBefore(icon, tags[i]);
				}
			}
		}
		var self = this;
			
		// we build the items
		var elements = self.$el.querySelectorAll("h1,h2,h3,h4,h5,h6");
		var last = null;
		var counter = 0;
		elements.forEach(function(element) {
			var item = {
				index: counter++,
				title: element.innerHTML.replace(/<[^>]+>/g, ""),
				depth: parseInt(element.tagName.replace(/h/i, "")),
				children: [],
				parent: null
			};
			element.setAttribute("toc-index", item.index);
			var target = null;
			if (last != null) {
				// equally deep, its a sibling
				if (last.depth == item.depth) {
					item.parent = last.parent;
					target = last.parent ? last.parent.children : null;
				}
				// less deep, it is a sibling of one of the parents
				else if (last.depth > item.depth) {
					var current = last;
					for (var i = 0; i <= last.depth - item.depth; i++) {
						current = current.parent;
					}
					item.parent = current;
					target = current ? current.children : null;
				}
				else if (last.depth < item.depth) {
					item.parent = last;
					target = last.children;
				}
			}
			if (target == null) {
				target = self.items;
			}
			target.push(item);
			last = item;
		});
	},
	methods: {
		resetInlineContent: function() {
			// remove previous content
			this.$refs.inline.innerHTML = "%{Loading...}";
			this.lastLoadedInline = null;
		},
		activate: function(item) {
			var element = document.querySelector("[toc-index='" + item.index + "']");
			if (element) {
				element.scrollIntoView(true);
			}
		}
	}
});

Vue.component("wiki-toc", {
	template: "#wiki-toc",
	props: {
		root: {
			type: Boolean,
			required: false
		},
		items: {
			type: Array,
			required: true
		}
	}
})