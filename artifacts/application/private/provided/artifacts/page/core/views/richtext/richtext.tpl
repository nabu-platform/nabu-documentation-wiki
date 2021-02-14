<template id="page-richtext">
	<div class="page-richtext">
		<n-form-richtext v-if="edit" v-model="cell.state.content" :clean-style='cell.state.cleanStyle' :class="{'richtext-empty': !cell.state.content || !cell.state.content.replace(/<[^>]+>/, '') }"/>
		<div v-else-if="!cell.state.highlight" v-content.parameterized="{value:$services.page.translate(cell.state.content), sanitize: true, compile: cell.state.compile }"></div>
		<div v-else v-content="highlight($services.page.translate(cell.state.content))"></div>
	</div>
</template>

<template id="page-richtext-configure">
	<n-form>
		<n-form-section>
			<n-collapsible title="Rich text settings">
				<div class="padded-content">
					<n-form-switch v-model='cell.state.cleanStyle' label='Clean style on paste'/>
					<n-form-switch v-model='cell.state.compile' label='Compile content'/>
					<n-form-switch v-if="false" v-model='cell.state.highlight' label='Highlight'/>
				</div>
			</n-collapsible>
		</n-form-section>
	</n-form>
</template>