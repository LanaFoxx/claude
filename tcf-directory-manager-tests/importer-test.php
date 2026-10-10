<?php
define('ABSPATH', '/');
define('HOUR_IN_SECONDS', 3600);
$GLOBALS['META'] = []; $GLOBALS['POSTS'] = []; $GLOBALS['TR'] = [];
function sanitize_text_field($s){ return trim(preg_replace('/[\r\n\t ]+/', ' ', strip_tags((string)$s))); }
function sanitize_textarea_field($s){ return trim(strip_tags((string)$s)); }
function esc_url_raw($s){ return filter_var($s, FILTER_SANITIZE_URL); }
function sanitize_key($s){ return preg_replace('/[^a-z0-9_\-]/', '', strtolower((string)$s)); }
function wp_json_encode($v, $f = 0){ return json_encode($v, $f); }
function wp_parse_url($u, $c = -1){ return parse_url($u, $c); }
function current_time($f){ return date($f === 'c' ? 'c' : $f); }
function get_the_title($id){ return $GLOBALS['POSTS'][$id]['title'] ?? ''; }
function get_post_status($id){ return $GLOBALS['POSTS'][$id]['status'] ?? false; }
function get_post_type($id){ return isset($GLOBALS['POSTS'][$id]) ? 'tcf_provider' : false; }
function get_posts($a){ $o=[]; foreach ($GLOBALS['POSTS'] as $id=>$p) $o[] = !empty($a['fields']) ? $id : (object)['ID'=>$id,'post_title'=>$p['title'],'post_status'=>$p['status']]; return $o; }
function delete_transient($k){ unset($GLOBALS['TR'][$k]); }
function get_transient($k){ return $GLOBALS['TR'][$k] ?? false; }
function set_transient($k,$v,$t=0){ $GLOBALS['TR'][$k]=$v; }
function get_current_user_id(){ return 1; }
function wp_generate_uuid4(){ return 'batch' . mt_rand(); }
// ACF-ish store keyed by field key -> name
function tcfname($k){ foreach (TCFD_Fields::scalars() as $n=>$d) if ($d[0]===$k) return $n; return ['field_tcf_provider_offers'=>'provider_offers','field_tcf_provider_aliases'=>'provider_aliases'][$k] ?? $k; }
function get_field($k,$id,$fmt=true){ $v = $GLOBALS['META'][$id][tcfname($k)] ?? null; if ($fmt && TCFD_Fields::type(tcfname($k))==='date' && $v) return substr($v,0,4).'-'.substr($v,4,2).'-'.substr($v,6,2); return $v; }
function update_field($k,$v,$id){ $GLOBALS['META'][$id][tcfname($k)] = $v; return true; }
function delete_field($k,$id){ unset($GLOBALS['META'][$id][tcfname($k)]); }
final class TCFD_Plugin { const POST_TYPE='tcf_provider'; }
$D=__DIR__.'/../tcf-directory-manager/includes/';
require $D.'class-fields.php'; require $D.'class-store.php'; require $D.'class-normalizer.php'; require $D.'class-importer.php';
function check($c,$m){ echo ($c?'PASS ':'FAIL ').$m."\n"; if(!$c) $GLOBALS['fail']=1; }

// existing provider
$GLOBALS['POSTS'][44] = ['title'=>'@ 1st Attempt (At Your Pace Online)','status'=>'publish'];
$GLOBALS['META'][44] = ['provider_website'=>'https://www.taxce.com','offers_20_hour_ce'=>'1','ce_current_price'=>'', 'ce_price_display_text'=>'Current public price not captured','ce_price_type'=>'not_public',
  'provider_offers'=>[['offer_active'=>1,'offer_type'=>'Coupon Code','offer_course_scope'=>'20-Hour CE','offer_title'=>'PACE10 coupon','coupon_code'=>'PACE10','offer_import_status'=>'VERIFIED PUBLIC CODE','offer_expiration_date'=>'','offer_source_url'=>'https://www.taxce.com/coupon-code']]];
$GLOBALS['POSTS'][45] = ['title'=>'Surgent Income Tax School','status'=>'publish'];
$GLOBALS['META'][45] = ['provider_website'=>'https://www.surgent.com','offers_20_hour_ce'=>'1','offers_60_hour_qe'=>'1','self_paced'=>'1'];

// 1. sample JSON with fences and chatter
$sample = file_get_contents(''.__DIR__.'/../tcf-directory-manager/templates/sample.json');
$r = TCFD_Normalizer::parse("Here you go!\n```json\n$sample\n```\nLet me know.");
check(!$r['errors'] && count($r['records'])===1, 'fenced JSON parsed');
$rec = $r['records'][0];
check($rec['fields']['ce_current_price']===69.95 && $rec['fields']['online_course_available']===1 && $rec['fields']['in_person_course_available']===0, 'prices + features mapped');
check(!isset($rec['fields']['live_instruction_available']), 'null feature stays unknown');
check($rec['offers'][0]['offer_import_status']==='VERIFIED PUBLIC CODE' && $rec['offers'][0]['offer_expiration_date']==='20261231', 'offer verified + date');
check($rec['fields']['google_rating_status']==='Manual Review', 'google without verified flag => Manual Review');
check(!isset($rec['fields']['qe_current_price']), 'qe null ignored');

// 2. match + diff against existing
$idx = TCFD_Importer::index();
$m = TCFD_Importer::match(['ctec_number'=>'','name'=>'1st Attempt At Your Pace Online','website'=>''], $idx);
check($m['status']==='matched' && $m['post_id']===44, 'name match ignores punctuation');
$m = TCFD_Importer::match(['ctec_number'=>'','name'=>'Surgent','website'=>'surgent.com/ctec'], $idx);
check($m['status']==='matched' && $m['post_id']===45 && $m['method']==='website', 'domain match');
$recA = TCFD_Normalizer::parse(json_encode(['providers'=>[['provider_name'=>'@ 1st Attempt (At Your Pace Online)','website'=>'https://www.taxce.com','offers_20_hour_ce'=>true,
   'ce'=>['price'=>'$59.00','price_type'=>'Complete package','source_url'=>'https://www.taxce.com/ca'],
   'features'=>['Online Course'=>'yes','Self-Paced'=>true,'Physical Book'=>'unknown','Mobile'=>'Y'],
   'offers'=>[['type'=>'coupon','scope'=>'20 hour','coupon_code'=>'PACE10','discount'=>'10%','source_url'=>'https://www.taxce.com/coupon-code','verified'=>'yes'],
              ['type'=>'Coupon Code','coupon_code'=>'FAKE50']]]]]))['records'][0];
check($recA['fields']['ce_current_price']===59.0 && $recA['fields']['ce_price_type']==='package' && $recA['fields']['ce_price_status']==='VERIFIED' && $recA['fields']['ce_price_display_text']==='$59', 'loose price parsing');
check($recA['fields']['mobile_friendly']===1 && !isset($recA['fields']['physical_book_available']), 'feature aliases + unknown');
check($recA['offers'][1]['offer_import_status']==='' && count($recA['warnings'])>=1, 'unsourced code => no status + warning');
$d = TCFD_Importer::diff($recA, 44, ['mode'=>'overwrite']);
$f = array_column($d['fields'],'field');
check(in_array('ce_current_price',$f) && in_array('ce_price_display_text',$f) && !in_array('provider_website',$f) && !in_array('offers_20_hour_ce',$f), 'diff only real changes: '.implode(',',$f));
check($d['offers'] && $d['offers']['added']===1 && $d['offers']['updated']===1 && count($d['offers']['new'])===2, 'offers merged by code');
check($d['offers']['new'][1]['offer_import_status']==='NEEDS REVIEW' && $d['offers']['new'][0]['offer_import_status']==='VERIFIED PUBLIC CODE' && $d['offers']['new'][1]['offer_active']===1, 'new unsourced offer => NEEDS REVIEW; existing keeps verified');
$recK = TCFD_Normalizer::parse(json_encode(['providers'=>[['provider_name'=>'@ 1st Attempt (At Your Pace Online)','offers'=>[['coupon_code'=>'PACE10','scope'=>'20-Hour CE','description'=>'Updated terms']]]]]))['records'][0];
$dk = TCFD_Importer::diff($recK, 44, ['mode'=>'overwrite']);
check($dk['offers'] && $dk['offers']['new'][0]['offer_import_status']==='VERIFIED PUBLIC CODE' && $dk['offers']['new'][0]['offer_description']==='Updated terms' && $dk['offers']['new'][0]['offer_source_url']!=='', 'partial offer update keeps existing values');
check($d['aliases']===[], 'no alias for same name');
$d2 = TCFD_Importer::diff($recA, 44, ['mode'=>'fill_empty']);
$f2 = array_column($d2['fields'],'field');
check(in_array('ce_current_price',$f2) && !in_array('ce_price_display_text',$f2), 'fill_empty keeps existing text');

// 3. apply via importer internals
$GLOBALS['wpdb'] = new class { public $prefix='wp_'; public $rows=[]; function insert($t,$d){ if(str_contains($t,'log')) $this->rows[]=(object)($d+['id'=>count($this->rows)+1]); }
  function replace(){ } function update(){ } function prepare($q,...$a){ return [$q,$a]; } function get_results($q){ $b=$q[1][0]; return array_reverse(array_values(array_filter($this->rows, fn($r)=>$r->batch_id===$b))); } };
function wp_insert_post($a){ $id=max(array_keys($GLOBALS['POSTS']))+1; $GLOBALS['POSTS'][$id]=['title'=>$a['post_title'],'status'=>$a['post_status']]; return $id; }
function is_wp_error($x){ return false; }
function wp_update_post($a){ $GLOBALS['POSTS'][$a['ID']]['status']=$a['post_status']; }
function wp_trash_post($id){ $GLOBALS['POSTS'][$id]['status']='trash'; }
function get_post($id){ return isset($GLOBALS['POSTS'][$id]) ? (object)['ID'=>$id] : null; }
function mb_substr_($s){return $s;}
$raw = json_encode(['providers'=>[
  ['provider_name'=>'@ 1st Attempt (At Your Pace Online)','website'=>'https://www.taxce.com','ce'=>['price'=>59,'source_url'=>'https://www.taxce.com/ca'],'features'=>['online_course'=>true]],
  ['provider_name'=>'Brand New Tax School','website'=>'https://newtax.example','offers_60_hour_qe'=>true,'qe'=>['price'=>199,'source_url'=>'https://newtax.example/p'],'features'=>['video_lessons'=>true]],
  ['provider_name'=>'Surgent Income Tax School','listing_status'=>'removed'],
]]);
$before44 = $GLOBALS['META'][44];
$GLOBALS['META'][45]['qe_price_last_checked']=null;
$pv = TCFD_Importer::preview($raw, 'test', ['mode'=>'overwrite','create'=>true,'draft_missing'=>false]);
$items = TCFD_Importer::load_preview($pv['batch'])['items'];
check($items[1]['match']['status']==='new' && $items[2]['match']['status']==='matched', 'preview statuses');
$res = TCFD_Importer::apply($pv['batch'], [0=>'44',1=>'new',2=>'45']);
check($res['created']===1 && $res['updated']>=1 && $res['drafted']===1, 'apply result '.json_encode($res));
check($GLOBALS['META'][44]['ce_current_price']===59.0 && $GLOBALS['META'][44]['online_course_available']===1, 'values written');
$new = max(array_keys($GLOBALS['POSTS']));
check($GLOBALS['POSTS'][$new]['title']==='Brand New Tax School' && $GLOBALS['META'][$new]['qe_current_price']===199.0, 'new provider created');
check($GLOBALS['POSTS'][45]['status']==='draft', 'removed provider hidden');
TCFD_Importer::undo($pv['batch']);
check($GLOBALS['POSTS'][45]['status']==='publish' && $GLOBALS['POSTS'][$new]['status']==='trash', 'undo status + created');
check(($GLOBALS['META'][44]['ce_current_price'] ?? '')==='' || !isset($GLOBALS['META'][44]['ce_current_price']), 'undo field value');
check(!isset($GLOBALS['META'][44]['online_course_available']), 'undo feature');

// 4. CSV roundtrip via export columns
require ''.__DIR__.'/../tcf-directory-manager/includes/class-admin.php';
$recs = TCFD_Importer::export_records();
$ref = new ReflectionMethod('TCFD_Admin','to_csv_row'); $ref->setAccessible(true);
$fh = fopen('php://temp','r+'); fputcsv($fh, TCFD_Admin::csv_columns(), ',', '"', '\\'); foreach ($recs as $r) fputcsv($fh, $ref->invoke(null,$r), ',', '"', '\\'); rewind($fh); $csv = stream_get_contents($fh);
$pc = TCFD_Normalizer::parse($csv);
check(!$pc['errors'] && $pc['format']==='csv' && count($pc['records'])===count($recs), 'csv parsed '.count($pc['records']));
$c44 = $pc['records'][0];
check(($c44['offers'][0]['coupon_code'] ?? '')==='PACE10' && $c44['offers'][0]['offer_import_status']==='VERIFIED PUBLIC CODE', 'csv offer roundtrip');
$dd = TCFD_Importer::diff($c44, 44, ['mode'=>'overwrite']);
check(TCFD_Importer::count_changes($dd)===0, 'csv roundtrip produces no changes: '.json_encode($dd['fields']).json_encode($dd['offers']?'offers':''));
// JSON export roundtrip
$pj = TCFD_Normalizer::parse(json_encode(['schema_version'=>'2.0','providers'=>$recs]));
$dj = TCFD_Importer::diff($pj['records'][0], 44, ['mode'=>'overwrite']);
check(TCFD_Importer::count_changes($dj)===0, 'json roundtrip no changes: '.json_encode($dj['fields']));
// legacy 1.0
$p1 = TCFD_Normalizer::parse(json_encode(['schema_version'=>'1.0','providers'=>[['provider_name'=>'X','website'=>'x.com','fields'=>['ce_current_price'=>10,'bogus'=>1],'offers'=>[]]]]));
check($p1['records'][0]['fields']['ce_current_price']===10.0 && $p1['records'][0]['offers']===[], 'legacy 1.0 parsed');
// bad json
$pb = TCFD_Normalizer::parse('{"providers": [ {"provider_name": "A"');
check(!empty($pb['errors']), 'truncated JSON reports error');
echo json_encode([TCFD_Normalizer::canon_offer($GLOBALS["META"][44]["provider_offers"][0]), TCFD_Normalizer::canon_offer($pj["records"][0]["offers"][0]), $dj["aliases"]], JSON_PRETTY_PRINT),"\n";
echo empty($GLOBALS['fail']) ? "ALL PASS\n" : "SOME FAILED\n";
