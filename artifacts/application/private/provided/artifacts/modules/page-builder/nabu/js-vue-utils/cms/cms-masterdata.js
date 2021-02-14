Vue.mixin({
	filters: {
		resolveMasterdataId: function(masterdataId) {
			return this.resolveMasterdataId(masterdataId);
		}	
	},
	methods: {
		resolveMasterdataId: function(masterdataId) {
			var target = this.$root;
			//var target = application.services.vue;
			if (!target) {
				throw "Could not find root vm";
			}
			if (!target.masterdata) {
				target.masterdata = {
					// ids pending resolution
					idsToResolve: [],
					// the resolution timer
					timer: null,
					// id = record
					resolved: {}
				};
			}
			// check if we already have it
			if (target.masterdata.resolved[masterdataId]) {
				return target.masterdata.resolved[masterdataId].name;
			}
			var result = null;
			// check if we have preloaded masterdata
			if (masterdata) {
				for (key in masterdata) {
					if (masterdata[key] instanceof Array) {
						for (var i = 0; i < masterdata[key].length; i++) {
							if (masterdata[key][i].id == masterdataId && masterdata[key][i].name) {
								result = masterdata[key][i];
								break;
							}
						}
					}
					if (result != null) {
						break;
					}
				}
			}
			var self = this;
			// the resolving function
			var resolve = function() {
				var ids = target.masterdata.idsToResolve;
				if (ids && ids.length) {
					var query = "?";
					for (var i = 0; i < ids.length; i++) {
						if (query != "?") {
							query += "&";
						}
						query += "entryId=" + ids[i];
					}
					// reset the state of the resolving
					target.masterdata.idsToResolve.splice(0, target.masterdata.idsToResolve.length);
					target.masterdata.timer = null;
					nabu.utils.ajax({
						method: "GET",
						url: "${server.root()}masterdata/entry/resolve" + query,
						success: function(response) {
							var result = JSON.parse(response.responseText);
							if (result.entries && result.entries.length) {
								for (var i = 0; i < result.entries.length; i++) {
									target.masterdata.resolved[result.entries[i].id] = result.entries[i];
									Vue.set(self.$data, result.entries[i].id, result.entries[i].name);
								}
							}
						}
					});
				}
			};
			if (result != null) {
				return result.name;
			}
			// if we did not find a result, ask the server
			// add it to the idsToResolve
			if (target.masterdata.idsToResolve.indexOf(masterdataId) < 0) {
				target.masterdata.idsToResolve.push(masterdataId);
				// set a value that can be returned and updated later
				Vue.set(self.$data, masterdataId, "");
				// if there is a timer pending, reset it
				if (target.masterdata.timer != null) {
					clearTimeout(target.masterdata.timer);
					target.masterdata.timer = null;
				}
				// set a timeout
				target.masterdata.timer = setTimeout(resolve, 25);
			}
			return self.$data[masterdataId];
		}
	}	
});