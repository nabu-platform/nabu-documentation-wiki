<template id="page-share-social">
	<div class="page-share-social" :class="cell.state.class">
		<n-sidebar v-if="configuring" @close="configuring = false" class="settings" :inline="true">
			<n-form class="layout2">
				<n-form-section>
					<n-collapsible title="Share settings">
						<n-form-text v-model="cell.state.link" label="Link to share" info="Defaults to the current page"/>
						<n-form-combo v-model="cell.state.class" label="Class" 
							:filter="function(value) { return $services.page.classes('page-share-social', value) }"/>
						<div class="list">
							<div v-for="i in Object.keys(cell.state.share)" class="list-row">
								<n-form-combo label="Provider" v-model="cell.state.share[i].provider" :items="['facebook', 'linkedin', 'twitter', 'pinterest']"/>
								<button @click="cell.state.share.splice(i)"><span class="fa fa-trash"></span></button>
							</div>
						</div>
						<button @click="cell.state.share.push({})">Add Provider</button>
					</n-collapsible>
				</n-form-section>
			</n-form>
		</n-sidebar>
		<div class="share-icons" v-if="cell.state.share">
			<div class="share-icon" v-for="share in cell.state.share">
				<a :href="generateLink(share.provider)" target="_blank" @click="analyze">
					<span :class="share.provider" class="icon"></span>
				</a>
			</div>
		</div>
	</div>
</template>