<template id="page-youtube">
	<div class="page-youtube">
		<n-sidebar v-if="configuring" @close="configuring = false" class="settings" :inline="true">
			<n-form class="layout2">
				<n-form-section>
					<n-collapsible title="Youtube settings">
						<n-form-text v-model='cell.state.url' label='Url'/>
						<n-form-text v-model='cell.state.width' label='Width'/>
						<n-form-text v-model='cell.state.height' label='Height'/>
						<n-form-switch v-model="cell.state.hideControls" label="Hide Controls"/>
					</n-collapsible>
				</n-form-section>
			</n-form>
		</n-sidebar>
		<iframe ref="iframe" v-if="url && !$services.page.isSsr" :width="cell.state.width ? cell.state.width : 560" :height="cell.state.height ? cell.state.height : 315" :src="url" 
			frameborder="0" 
			allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
		<a :href="url" rel="nofollow noreferrer noopener" v-else-if="$services.page.isSsr">%{Go to youtube}</a>
	</div>
</template>