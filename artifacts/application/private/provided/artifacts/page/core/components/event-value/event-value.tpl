<template id="page-event-value">
	<component :is="inline ? 'div' : 'n-collapsible'" :title="title" class="page-event-value">
		<div :class="{'padded-content': !inline}">
			<n-form-text v-model="container[name].name" :label="inline ? title : 'Event Name'" :timeout="600" @input="$emit('updatedEvents')"/>
			<div v-for="eventField in container[name].eventFields" class="list-row">
				<n-form-text v-model="eventField.name" label="Field Name" :timeout="600"/>
				<n-form-combo v-model="eventField.stateValue" v-if="!eventField.isFixed" label="State Value"
					:filter="function(value) { return $services.page.getSimpleKeysFor({properties:$services.page.getAllAvailableParameters(page, null, true)}, true).filter(function(x) { return !value || x.toLowerCase().indexOf(value.toLowerCase()) >= 0 }) }"/>
				<n-form-text v-model="eventField.fixedValue" v-else label="Fixed Value" :timeout="600"/>
				<n-form-switch v-model="eventField.isFixed" label="Fixed?"/>
				<span @click="container[name].eventFields.splice(container[name].eventFields.indexOf(eventField), 1) & $emit('updatedEvents')" class="fa fa-times"></span>
			</div>
		</div>
		<div class="list-actions" v-if="container[name].name">
			<button @click="addEventField(container[name]) & $emit('updatedEvents')"><span class="fa fa-plus"></span>Event Field</button>
		</div>
	</component>
</template>
