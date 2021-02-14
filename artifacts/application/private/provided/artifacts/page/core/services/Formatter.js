nabu.services.VueService(Vue.extend({
	methods: {
		format: function(value, properties, page, cell) {
			if (!properties.format) {
				return value;
			}
			else if (properties.format == "checkbox") {
				return "<n-form-checkbox :value='value' />";
			}
			else if (value == null || typeof(value) == "undefined") {
				return null;
			}
			// formatting is optional
			else if (!properties.format || properties.format == "text") {
				return value;
			}
			else if (properties.format == "html") {
				return properties.html ? properties.html : value;
			}
			else if (properties.format == "link") {
				return "<a target='_blank' ref='noopener noreferrer nofollow' href='" + value + "'>" + value.replace(/http[s]*:\/\/([^/]+).*/, "$1") + "</a>";
			}
			else if (properties.format == "date") {
				if (value && properties.isTimestamp) {
					value = new Date(value);
				}
				else if (value && properties.isSecondsTimestamp) {
					value = new Date(1000 * value);
				}
				return this.date(value, properties.dateFormat);
			}
			// backwards compatibility
			else if (properties.format == "dateTime") {
				return this.date(value, "dateTime");
			}
			else if (properties.format == "number") {
				return this.number(value, properties.amountOfDecimals);
			}
			else if (properties.format == "masterdata") {
				return this.masterdata(value);
			}
			else if (properties.format == "javascript") {
				return this.javascript(value, properties.javascript, properties.state, properties.$value);
			}
			// otherwise we are using a provider
			else {
				var result = nabu.page.providers("page-format").filter(function(x) { return x.name == properties.format })[0]
					.format(value, properties, page, cell);
				return result;
			}
		},
		javascript: function(value, code, state, $value) {
			var $services = this.$services;
			if (code instanceof Function) {
				return code(value);
			}
			else {
				var result = (new Function('with(this) { return ' + code + ' }')).call({
					value: value,
					$value: $value,
					state: state,
					$services: this.$services
				});
				//var result = eval(code);
				if (result instanceof Function) {
					result = result.bind(this);
					result = result(value);
				}
				return result;
			}
		},
		date: function(date, format) {
			if (!date) {
				return null;
			}
			else if (typeof(date) == "string") {
				date = new Date(date);
			}
			if (!format || format == "date") {
				format = "yyyy-MM-dd";
			}
			else if (format == "dateTime") {
				format = "yyyy-MM-ddTHH:mm:ss.SSS";
			}
			format = format.replace(/yyyy/g, date.getFullYear());
			format = format.replace(/yy/g, ("" + date.getFullYear()).substring(2, 4));
			format = format.replace(/dd/g, (date.getDate() < 10 ? "0" : "") + date.getDate());
			format = format.replace(/d/g, date.getDate());
			format = format.replace(/HH/g, (date.getHours() < 10 ? "0" : "") + date.getHours());
			format = format.replace(/H/g, date.getHours());
			format = format.replace(/mm/g, (date.getMinutes() < 10 ? "0" : "") + date.getMinutes());
			format = format.replace(/m/g, date.getMinutes());
			format = format.replace(/ss/g, (date.getSeconds() < 10 ? "0" : "") + date.getSeconds());
			format = format.replace(/s/g, date.getSeconds());
			format = format.replace(/[S]+/g, date.getMilliseconds());
			// we get an offset in minutes
			format = format.replace(/[X]+/g, Math.floor(date.getTimezoneOffset() / 60) + ":" + date.getTimezoneOffset() % 60);
			// do months last as they can introduce named months which might conflict with expressions in the above
			// e.g. "Sep" could trigger the millisecond replacement
			// replacing a month with "May" could trigger the single "M" replacement though
			// so first we replace the capital M with something that should never conflict
			if (nabu.utils.dates.days) {
				format = format.replace(/E/g, "#");
			}
			format = format.replace(/M/g, "=");
			format = format.replace(/====/g, nabu.utils.dates.months()[date.getMonth()]);
			format = format.replace(/===/g, nabu.utils.dates.months()[date.getMonth()].substring(0, 3));
			format = format.replace(/==/g, (date.getMonth() < 9 ? "0" : "") + (date.getMonth() + 1));
			format = format.replace(/=/g, date.getMonth() + 1);
			
			// this was added later, hence the defensive check for projects that don't have this yet
			if (nabu.utils.dates.days) {
				format = format.replace(/####/g, nabu.utils.dates.days()[nabu.utils.dates.dayOfWeek(date)]);
				format = format.replace(/###/g, nabu.utils.dates.days()[nabu.utils.dates.dayOfWeek(date)].substring(0, 3));
			}
			format = format.replace(/##/g, (nabu.utils.dates.dayOfWeek(date) < 9 ? "0" : "") + (nabu.utils.dates.dayOfWeek(date) + 1));
			format = format.replace(/#/g, nabu.utils.dates.dayOfWeek(date) + 1);
			return format;
		},
		masterdata: function(id) {
			if (!id) {
				return "";
			}
			var entry = this.$services.masterdata.entry(id);
			if (entry) {
				return entry.label;
			}
			var category = this.$services.masterdata.category(id);
			if (category) {
				return category.label;
			}
			return this.$services.masterdata.resolve(id);
		},
		number: function(input, amountOfDecimals) {
			amountOfDecimals = amountOfDecimals == null ? 2 : parseInt(amountOfDecimals);
			if (typeof(input) != "number") {
				input = parseFloat(input);
			}
            return Number(input.toFixed(amountOfDecimals)).toLocaleString(this.$services.page.getLocale());
		},
		conventionize: function(value) {
			// we currently assume from lower camelcase to word
			return value.substring(0, 1).toUpperCase() + value.substring(1).replace(/([A-Z]+)/g, " $1");
		}
	}
}), { name: "nabu.page.services.Formatter" });