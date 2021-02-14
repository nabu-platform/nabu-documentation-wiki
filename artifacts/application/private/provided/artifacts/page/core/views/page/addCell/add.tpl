<template id="page-add-cell">
	<n-form class="layout2 page">
		<n-form-section>
			<n-form-combo label="Show On" v-model="on" :items="availableEvents"/>
			<n-form-combo label="Route" :filter="filterRoutes" v-model="route"
				:formatter="function(x) { return x.alias }"
				:required="true"/>
			<n-form-combo label="Target" v-if="on" :items="['page', 'sidebar']" v-model="target"/>
		</n-form-section>
		<n-page-mapper :to="parameters" v-if="parameters.length" :from="availableParameters" v-model="bindings"/>
		<footer class="actions">
			<a href="javascript:void(0)" @click="$reject()">Cancel</a>
			<button @click="set" :disabled="!route">Set Content</button>
		</footer>
	</n-form>
</template>