/*
A notification has a standard layout:

- name: the name of the notification (if any), it can be used to perform some action (like close all notifications with name 'something')
- event: the name of the event (if any) that caused the notification to be sent out, unlikely to be useful
- duration: how long should the notification be visible? if explicitly set to 0, it will stay open until the user closes it (this assumes closeable is turned on...)
- title (optional)
- message (required)
- severity
- closeable (is there an x to close early?)
- icon (is there an icon to show?)
- actions []: array of actions you can perform, each action has:
	- component: if the name of a component is specified, that is rendered with the data of the notification as v-bind parameters (this allows you to fully freestyle)
			if not specified, the action is assumed to be a button
	- class: the class to be applied to the component / button
	- click: what should happen on click? (generic handler)
	- route: you can set a route where the user fill be redirected to if they click it (in lieu of the generic handler)
	- the route will be passed the data from the notification to best match the input parameters
		-> you can craft custom events to get the data just right if needed
- data
	-> a notification is triggered by an event, the data object contains whatever data is in the event
	-> this data is passed 


page builder extensions:
- condition: an additional condition when the event should trigger
- on: the event to trigger on
*/
Vue.service("notifier", {
	methods: {
		activeProviders: function() {
			// IE does not have this
			var priority = Number.MIN_SAFE_INTEGER ?  Number.MIN_SAFE_INTEGER : -1000000;	
			// there can only be one notifier active, based on priority
			return nabu.page.providers("page-notifier").sort(function(a, b) {
				if (a.priority == null) {
					a.priority = 0;
				}
				if (b.priority == null) {
					b.priority = 0;
				}
				// highest first!
				return b.priority - a.priority;
			}).filter(function(x) {
				// if we have the same priority or higher than the current one, we assume it is ok to add
				if (x.priority >= priority) {
					priority = x.priority;
					return true;
				}
				return false;
			});
		},
		apply: function(x) {
			this.activeProviders().forEach(x);
		},
		push: function(notification) {
			// if data is missing (e.g. no duration, no closeable etc), the implementation can choose what the default behavior should be
			// if we rectified the data here, the implementation would never know the original request
			this.apply(function(x) {
				x.push(notification);
			});
		}
	}
});