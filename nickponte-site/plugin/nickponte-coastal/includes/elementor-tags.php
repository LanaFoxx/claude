<?php
if (!defined('ABSPATH')) exit;

abstract class NPC_Tag_Town_Text extends \Elementor\Core\DynamicTags\Tag {
	public function get_group() { return 'nick-ponte'; }
	public function get_categories() { return [\Elementor\Modules\DynamicTags\Module::TEXT_CATEGORY]; }
	abstract protected function value($t);
	protected function register_controls() {
		$this->add_control('bold', ['label' => 'Bold', 'type' => \Elementor\Controls_Manager::SWITCHER, 'default' => '']);
	}
	public function render() {
		$p = npc_el_town(); if (!$p) return;
		$v = $this->value(npc_town_data($p));
		echo $this->get_settings('bold') === 'yes' ? '<b>' . $v . '</b>' : $v; // value is already escaped
	}
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
		$t = $p ? npc_town_data($p) : null;
		$id = $t && !empty($t['img']) && is_numeric($t['img']) ? (int) $t['img'] : 0;
		if (!$id) $id = npc_media_id('npc-town-placeholder'); // towns without a photo yet
		return $id ? ['id' => $id, 'url' => wp_get_attachment_image_url($id, 'full')] : [];
	}
}
