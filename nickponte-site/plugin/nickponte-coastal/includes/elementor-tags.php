<?php
if (!defined('ABSPATH')) exit;

abstract class NPC_Tag_Town_Text extends \Elementor\Core\DynamicTags\Tag {
	public function get_group() { return 'nick-ponte'; }
	public function get_categories() { return [\Elementor\Modules\DynamicTags\Module::TEXT_CATEGORY]; }
	abstract protected function value($t);
	public function render() { $p = npc_el_town(); if ($p) echo wp_kses_post($this->value(npc_town_data($p))); }
}
class NPC_Tag_Town_Name extends NPC_Tag_Town_Text {
	public function get_name() { return 'npc-town-name'; }
	public function get_title() { return 'Town name'; }
	protected function value($t) { return esc_html($t['name']); }
}
class NPC_Tag_Town_Intro extends NPC_Tag_Town_Text {
	public function get_name() { return 'npc-town-intro'; }
	public function get_title() { return 'Town intro'; }
	protected function value($t) { return esc_html($t['intro']); }
}
class NPC_Tag_Town_Updated extends NPC_Tag_Town_Text {
	public function get_name() { return 'npc-town-updated'; }
	public function get_title() { return 'Town snapshot month'; }
	protected function value($t) { return esc_html($t['updated']); }
}
class NPC_Tag_Town_Photo extends \Elementor\Core\DynamicTags\Data_Tag {
	public function get_name() { return 'npc-town-photo'; }
	public function get_title() { return 'Town photo'; }
	public function get_group() { return 'nick-ponte'; }
	public function get_categories() { return [\Elementor\Modules\DynamicTags\Module::IMAGE_CATEGORY]; }
	public function get_value(array $options = []) {
		$p = npc_el_town();
		$id = $p ? get_post_thumbnail_id($p) : 0;
		if (!$id) $id = npc_media_id('npc-rye-coast');
		return $id ? ['id' => $id, 'url' => wp_get_attachment_image_url($id, 'full')] : [];
	}
}
