<template id="page-markdown">
	<div class="page-markdown">
		<n-form-text type="area" v-if="edit" v-model="cell.state.content" :auto-scale="true"/>
		<div v-else v-content="highlight($services.page.translate(cell.state.content))"></div>
	</div>
</template>