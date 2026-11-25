<?php
/**
 * GLEC step-by-step licensing guide ([glec_steps]) and Applications Considerations Chart ([glec_license_chart]).
 * Content: "1_Website_Home_Page_Verbiage_Content.docx" (A General Summary of 10 Steps; Applications Considerations Chart).
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

function glec_steps_config() {
	$h     = home_url( '/' );
	$books = 'https://sebookstore.com/glec.html';
	$steps = [
		[ 'id' => 'license', 'rail' => 'Choose your License', 'phase' => 'Phase 1 - Application & Design Classes', 'title' => 'Which of the 2 licenses listed below are you interested in?', 'task' => 'Choose the Restricted (Class 1) or the Non-Restricted (Class 2) License. Not sure yet? Compare the two licenses first.',
		  'type' => 'choose',
		  'options' => [
			[ 'value' => 'restricted', 'label' => 'Restricted (Class 1)', 'sub' => [ 'HVAC Units 5 tons or less cooling', 'HVAC Units 175,000 Btuh or less heating', '4+ years of experience' ] ],
			[ 'value' => 'nonrestricted', 'label' => 'Non-Restricted (Class 2)', 'sub' => [ 'All HVAC Units, any size', '5+ years of experience', 'Over 50% of your projects on HVAC Units over 5 tons' ] ],
			[ 'value' => 'unsure', 'label' => 'Compare the licenses', 'sub' => [ 'See both licenses side by side' ] ],
		  ],
		  'need' => [ 'text' => 'Compare the experience, references, education and document requirements for each license in the Applications Considerations Chart, then come back and choose.', 'cta' => 'Open the Comparison Chart', 'url' => '#chart',
			'compare' => [
				[ 'HVAC Unit size', '5 tons or less cooling, 175,000 Btuh or less heating', 'All HVAC Unit sizes' ],
				[ 'Experience', '4+ years under a licensed CA License Holder, 40+ hours per week', '5+ years under a licensed CA License Holder, 40+ hours per week; over 50% of projects on HVAC Units over 5 tons' ],
				[ 'Education credit', 'Tech or trade school diploma: deduct 1 year. Mechanical or HVAC engineering degree: deduct 2 years', 'Tech or trade school diploma: deduct 1 year. Mechanical or HVAC engineering degree: deduct 2 years' ],
				[ '3 Professional Licensed References', '1 CA License Holder plus any 2 of: CA License Holder, Registered Architect, Mechanical Engineer PE, City or County Inspector', '1 Non-Restricted CA License Holder plus any 2 of: Non-Restricted CA License Holder, Registered Architect, Mechanical Engineer PE, City or County Inspector' ],
				[ 'Design Classes required', 'Residential Design Class (HLG-DD-R-OL)', 'Residential Design Class (HLG-DD-R-OL) and Commercial Design Class (HLG-DD-C-OL)' ],
				[ 'Documents', 'EPA-608 Type 2 or higher, criminal background check, 2 IDs, Criminal History Consent Form, notarized Affidavit of Citizenship', 'Same as Restricted' ],
			] ] ],
		[ 'id' => 'epa', 'rail' => 'EPA-608 Technician Certification', 'title' => 'Do you have your EPA-608 Technician Certification?', 'task' => 'The Board requires you to have an EPA-608 Technician Certification, Type 2 or higher, for the application.',
		  'need' => [ 'text' => 'Get certified first. NATE offers remotely monitored online testing for EPA-608, and there are paper testing options in Atlanta.', 'cta' => 'See Technician Certifications', 'url' => $h . 'technician-certifications/' ] ],
		[ 'id' => 'resdesign', 'title' => 'Residential Design Class', 'code' => 'HLG-DD-R-OL', 'task' => 'The Residential Heat Loss/Gain &amp; Duct Design Class (ACCA Manuals J &amp; D). The Certificate of Completion is required in both of the two licenses.',
		  'need' => [ 'text' => 'Read the full class details, add the class to your cart, accept the terms and conditions, and purchase the class.', 'cta' => 'See the Residential Design Class', 'url' => $h . 'license-classes/residential-design/', 'sku' => 'HLG-DD-R-OL' ] ],
		[ 'id' => 'comdesign', 'title' => 'Commercial Design Class', 'code' => 'HLG-DD-C-OL', 'task' => 'The Commercial Heat Loss/Gain &amp; Duct Design Class (Carrier System Design Manuals 1, 2 and 3). Required for the Non-Restricted License only.',
		  'skipif' => 'restricted', 'skipnote' => 'Not required for the Restricted (Class 1) License, so you can skip this step.',
		  'need' => [ 'text' => 'Read the full class details and purchase the Commercial Design Class.', 'cta' => 'See the Commercial Design Class', 'url' => $h . 'license-classes/commercial-design/', 'sku' => 'HLG-DD-C-OL' ] ],
		[ 'id' => 'designbooks', 'title' => 'Reference Books for the Design Classes', 'task' => 'You buy the Reference Books for the Design Classes separately.',
		  'need' => [ 'text' => 'You can buy them anywhere, but this is a one-stop shop with the books in stock.', 'cta' => 'Order the Design Reference Books', 'url' => $books, 'ext' => true ] ],
		[ 'id' => 'forms', 'title' => 'Complete all the required Application forms', 'code' => 'SOS-APP', 'task' => 'Application, references, transcripts, background check, certificates, IDs and payment. The Application process is on the Board&rsquo;s website, called <a href="https://sos.ga.gov/goals" target="_blank" rel="noopener">GOALS</a>.',
		  'need' => [ 'text' => 'The Application Overview Videos will assist you in filling out each page of the Application. The Videos are free and also included in the Design Classes.', 'cta' => 'See the Application Overview Videos', 'url' => $h . 'license-classes/application-overview/', 'sku' => 'SOS-APP' ] ],
		[ 'id' => 'approval', 'rail' => 'Approval from the Board', 'phase' => 'Phase 2 - Board approval, Exam Prep Class & Tabs', 'title' => 'Approval from the Board to take the exam', 'task' => 'Receive approval from the Conditioned Air Licensing Board to sit for the exam.',
		  'need' => [ 'text' => 'Once approved, PSI emails you instructions to schedule your exam and pick your testing location. Pay PSI to take the exam. You have a one-time option to re-schedule the exam (2 days before the scheduled exam).', 'cta' => 'See the Board Application process', 'url' => $h . 'board-application/', 'cta2' => 'Go to PSI Exams', 'url2' => 'https://www.psiexams.com', 'ext2' => true ] ],
		[ 'id' => 'examprep', 'title' => 'Exam Prep Review Class, and also Permanent TABs', 'code' => 'CA-OL', 'task' => 'The Conditioned Air License Exam Prep Review Class: the traditional License Exam Prep Review Class. Buy the Permanent TABs with it.',
		  'need' => [ 'text' => 'Buy this class once you are approved by the Board. It ships a printed Study Guide and covers every Reference Book except Manuals J &amp; D.', 'cta' => 'See the Exam Prep Review Class', 'url' => $h . 'license-classes/exam-prep-review/', 'sku' => 'CA-OL' ],
		  'need2' => [ 'title' => 'Also buy the Permanent TABs', 'code' => 'CA-TABs', 'text' => 'Pre-laser printed Permanent TABs for all the Reference Books, Restricted and Non-Restricted, with placement charts. Permanent TABs are required: repositionable tabs are not acceptable.', 'cta' => 'See the Permanent Reference TABs', 'url' => $h . 'license-classes/reference-tabs/', 'sku' => 'CA-TABs' ] ],
		[ 'id' => 'exambooks', 'title' => 'Reference Books for the Exam Prep Review Class', 'task' => 'You buy the Reference Books for the Exam Prep Review Class separately.',
		  'need' => [ 'text' => 'You can buy them anywhere, but this is a one-stop shop with the books in stock.', 'cta' => 'Order the Exam Prep Reference Books', 'url' => $books, 'ext' => true ] ],
		[ 'id' => 'licensed', 'rail' => 'Score Report and License Certificate', 'title' => 'Get your Score Report and License Certificate', 'task' => 'Your proctor at the PSI exam site will hand you your Score Report. Then go to the <a href="https://sos.ga.gov/goals" target="_blank" rel="noopener">GOALS</a> website to print your License Certificate.',
		  'have' => 'I have my License Certificate', 'needlabel' => 'Not yet',
		  'need' => [ 'text' => 'After your exam, your proctor at the PSI exam site hands you your Score Report. Then go to the GOALS website to print your License Certificate.', 'cta' => 'Go to GOALS', 'url' => 'https://sos.ga.gov/goals', 'ext' => true ] ],
	];
	foreach ( $steps as &$s ) {
		if ( ! empty( $s['need']['sku'] ) && function_exists( 'glec_sku_price' ) ) { $s['need']['price'] = glec_sku_price( $s['need']['sku'] ); }
		if ( ! empty( $s['need2']['sku'] ) && function_exists( 'glec_sku_price' ) ) { $s['need2']['price'] = glec_sku_price( $s['need2']['sku'] ); }
	}
	return apply_filters( 'glec_steps_config', $steps );
}

/* Review mode (?review=1): every step stacked with all its wording, so each can be commented on in MarkUp. */
function glec_steps_review_html( $steps ) {
	$ext = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';
	$base = get_permalink();
	$out  = '<div class="gwr"><div class="gwr__note"><b>Review mode.</b> All 10 steps are shown here so each one can be commented on. Students see one step at a time: <a href="' . esc_url( $base ) . '">open the live guide</a>.</div><ol class="gwr__list">';
	foreach ( $steps as $i => $st ) {
		$n    = $st['need'];
		$num  = $i + 1;
		if ( ! empty( $st['phase'] ) ) { $out .= '<li class="gwr__phase"><h2>' . esc_html( $st['phase'] ) . '</h2></li>'; }
		$out .= '<li class="gwr__step" id="step-' . $num . '"><div class="gwr__head"><span class="gwr__k">Step ' . $num . ' of ' . count( $steps ) . '</span><a class="gwr__open" href="' . esc_url( add_query_arg( 'step', $num, $base ) ) . '">Open this step in the guide</a></div>';
		$out .= '<h2 class="gwr__title">' . esc_html( html_entity_decode( $st['title'] ) ) . ( ! empty( $st['code'] ) ? ' <span class="gw__code">' . esc_html( $st['code'] ) . '</span>' : '' ) . '</h2><p class="gwr__task">' . wp_kses_post( $st['task'] ) . '</p>';
		if ( ! empty( $st['options'] ) ) {
			$out .= '<p class="gwr__label">Answer options</p><ul class="gwr__opts">';
			foreach ( $st['options'] as $o ) { $out .= '<li><b>' . esc_html( $o['label'] ) . '</b><span>' . esc_html( implode( ' · ', (array) $o['sub'] ) ) . '</span></li>'; }
			$out .= '</ul>';
		} else {
			$out .= '<p class="gwr__label">Answer options</p><ul class="gwr__opts"><li><b>' . esc_html( $st['have'] ?? 'I have this' ) . '</b><span>' . ( $num < count( $steps ) ? 'Go to step ' . ( $num + 1 ) : 'Finish' ) . '</span></li><li><b>' . esc_html( $st['needlabel'] ?? 'I need this' ) . '</b><span>Show me what to do</span></li></ul>';
		}
		if ( ! empty( $st['skipnote'] ) ) { $out .= '<p class="gwr__label">Shown instead for Restricted (Class 1)</p><div class="gwr__skip">' . wp_kses_post( $st['skipnote'] ) . '</div>'; }
		$out .= '<p class="gwr__label">' . ( ! empty( $st['options'] ) ? 'If they choose "Compare the licenses"' : 'If they choose "' . esc_html( $st['needlabel'] ?? 'I do not have this' ) . '"' ) . '</p><div class="gwr__need"><p class="gwr__needt">Here is what to do</p><p>' . wp_kses_post( $n['text'] ) . '</p>';
		if ( ! empty( $n['price'] ) ) { $out .= '<p class="gwr__price">' . esc_html( $n['price'] ) . '</p>'; }
		$out .= '<p class="gwr__ctas"><a href="' . esc_url( $n['url'] ) . '"' . ( ! empty( $n['ext'] ) ? ' target="_blank" rel="noopener"' : '' ) . '>' . esc_html( $n['cta'] ) . ( ! empty( $n['ext'] ) ? $ext : '' ) . '</a>';
		if ( ! empty( $n['cta2'] ) ) { $out .= '<a href="' . esc_url( $n['url2'] ) . '"' . ( ! empty( $n['ext2'] ) ? ' target="_blank" rel="noopener"' : '' ) . '>' . esc_html( $n['cta2'] ) . ( ! empty( $n['ext2'] ) ? $ext : '' ) . '</a>'; }
		$out .= '</p></div>';
		if ( ! empty( $st['need2'] ) ) { $n2 = $st['need2']; $out .= '<div class="gwr__need" style="margin-top:12px"><p class="gwr__needt">' . esc_html( $n2['title'] ) . ' <span class="gw__code">' . esc_html( $n2['code'] ) . '</span></p><p>' . wp_kses_post( $n2['text'] ) . '</p>' . ( ! empty( $n2['price'] ) ? '<p class="gwr__price">' . esc_html( $n2['price'] ) . '</p>' : '' ) . '<p class="gwr__ctas"><a href="' . esc_url( $n2['url'] ) . '">' . esc_html( $n2['cta'] ) . '</a></p></div>'; }
		if ( ! empty( $n['compare'] ) ) { $out .= '<p class="gwr__label">Comparison shown with it</p><table class="gw__cmp"><thead><tr><th></th><th>Restricted (Class 1)</th><th>Non-Restricted (Class 2)</th></tr></thead><tbody>'; foreach ( $n['compare'] as $r ) { $out .= '<tr><th>' . esc_html( $r[0] ) . '</th><td>' . esc_html( $r[1] ) . '</td><td>' . esc_html( $r[2] ) . '</td></tr>'; } $out .= '</tbody></table>'; }
		$out .= '</li>';
	}
	return $out . '</ol></div>';
}

add_shortcode( 'glec_steps', function () {
	$steps  = glec_steps_config();
	if ( isset( $_GET['review'] ) ) { return glec_steps_review_html( $steps ); } // phpcs:ignore
	$static = '';
	foreach ( $steps as $i => $s ) {
		$n       = $s['need'];
		$static .= '<li><h3>' . esc_html( ( $i + 1 ) . '. ' . html_entity_decode( $s['title'] ) ) . '</h3><p>' . wp_kses_post( $s['task'] ) . '</p><p>' . wp_kses_post( $n['text'] ) . ' <a href="' . esc_url( $n['url'] ) . '">' . esc_html( $n['cta'] ) . '</a></p></li>';
	}
	return '<div class="gw" data-gw=\'' . esc_attr( wp_json_encode( $steps ) ) . '\'><ol class="gw__static">' . $static . '</ol></div>';
} );

function glec_chart_rows() {
	$a = 'https://georgialicenseexam.com/wp-content/uploads/2016/12/';
	return [
		[ 'HVAC unit size restriction', '5 tons or less cooling, 175,000 Btuh or less heating', 'All unit sizes', $a . '1-Audio-Help-CA-HVAC-Unit-Size-1_05.mp3' ],
		[ 'Vertical market', 'Residential, apartments, condos and other light commercial buildings', 'Medium and large commercial, industrial', $a . '2-Audio-Help-CA-Vertical-Mkt-0_35.mp3' ],
		[ 'HVAC experience requirements', '4+ years under a licensed CA license holder, 40+ hours per week', '5+ years under a licensed CA license holder, 40+ hours per week. Over 50% of your projects have to be over 5-ton units.', $a . '3-Audio-Help-CA-HVAC-Exp-Rqmt-2_28.mp3' ],
		[ 'Tech or trade school HVAC certificate', 'Graduated with a diploma: deduct 1 year from the 4-year experience requirement', 'Graduated with a diploma: deduct 1 year from the 5-year experience requirement', $a . '4-Audio-Help-CA-Tech-Trade-Sch-1_35.mp3' ],
		[ 'Or engineering school degree', 'Graduated with a mechanical or HVAC engineering degree: deduct 2 years from the experience requirement', 'Graduated with a mechanical or HVAC engineering degree: deduct 2 years from the 5-year experience requirement', $a . '5-Audio-Help-CA-Engineering-Sch-0_35.mp3' ],
		[ '3 professional licensed references', '(1) CA license holder, Restricted or Non-Restricted, plus any (2) of: CA license holder, registered architect, mechanical engineer PE, or city or county inspector. References must have held their Conditioned Air license for at least 4 years of HVAC experience, and the license must be currently active.', '(1) CA license holder, Non-Restricted, plus any (2) of: CA Non-Restricted license holder, registered architect, mechanical engineer PE, or city or county inspector. References must have held their Conditioned Air license for at least 5 years of HVAC experience, and the license must be currently active.', $a . '6-Audio-Help-CA-3-Pro-Lic-Refs-1_37.mp3' ],
		[ 'Reciprocity with other states', 'No reciprocity from other states into Georgia', 'No reciprocity from other states into Georgia', $a . '7-Audio-Help-CA-Reciprocity-1_37.mp3' ],
		[ 'EPA-608 technician certification', 'Type 2 certification or higher', 'Type 2 certification or higher', $a . '8-Audio-Help-CA-EPA-Tech-Cert-0_47.mp3' ],
		[ 'Required design class: Residential Design (heat loss/gain &amp; duct design)', 'ACT-107 or AIRC-1060 at any TCSG (Technical College System of Georgia) school, though TCSG schools do not teach it as an exam prep class. Or the <a href="' . esc_url( home_url( '/license-classes/residential-design/' ) ) . '">GLEC HLG-DD-R-OL Residential Design Class</a>. Submit the Certificate of Completion with your application.', 'ACT-107 or AIRC-1060 at any TCSG school, though TCSG schools do not teach it as an exam prep class. Or the <a href="' . esc_url( home_url( '/license-classes/residential-design/' ) ) . '">GLEC HLG-DD-R-OL Residential Design Class</a>. Submit the Certificate of Completion with your application.', $a . '9-Audio-Help-CA-Res-Design-2_49.mp3' ],
		[ 'Commercial Design (heat loss/gain &amp; duct design, online)', 'Not required', 'Required: the <a href="' . esc_url( home_url( '/license-classes/commercial-design/' ) ) . '">GLEC HLG-DD-C-OL Commercial Design Class</a>. Submit the Certificate of Completion with your application.', $a . '10-Audio-Help-CA-Comm-Design-0_48.mp3' ],
		[ 'Criminal background check', 'Required, current within 6 months of the date on your application', 'Required, current within 6 months of the date on your application', $a . '11-Audio-Help-CA-Crim-BG-Check-3_10.mp3' ],
		[ 'SVD: secure and verifiable documents', 'Proof of US citizenship or legal alien status. Upload 2 IDs: driver&rsquo;s license, passport or Social Security card.', 'Proof of US citizenship or legal alien status. Upload 2 IDs: driver&rsquo;s license, passport or Social Security card.', $a . '12-Audio-Help-CA-Secure-Verify-1_01.mp3' ],
		[ 'Criminal history consent form (for the background check)', 'Required. You do not need to be fingerprinted. Go to your local law enforcement agency (police station).', 'Required. You do not need to be fingerprinted. Go to your local law enforcement agency (police station).', $a . '13-Audio-Help-CA-Consent-Form-0_55.mp3' ],
		[ 'Affidavit of citizenship', 'Required, and must be notarized', 'Required, and must be notarized', '' ],
		[ 'GLEC Conditioned Air Exam Prep Review Class (after you get approval)', '<a href="' . esc_url( home_url( '/license-classes/exam-prep-review/' ) ) . '">CA-OL</a>. Covers all the remaining books, with sample quizzes online.', '<a href="' . esc_url( home_url( '/license-classes/exam-prep-review/' ) ) . '">CA-OL</a>. Covers all the remaining books, with sample quizzes online.', $a . '14-Audio-Help-CA-Exam-Prep-Review-2_55.mp3' ],
	];
}

add_shortcode( 'glec_license_chart', function () {
	$play = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>';
	$rows  = '';
	foreach ( glec_chart_rows() as $r ) {
		$audio = $r[3] ? '<a class="gc__audio" href="' . esc_url( $r[3] ) . '" target="_blank" rel="noopener">' . $play . 'Audio help<span class="screen-reader-text">: ' . esc_html( wp_strip_all_tags( html_entity_decode( $r[0] ) ) ) . ' (opens in a new tab)</span></a>' : '';
		$rows .= '<tr><th scope="row">' . wp_kses_post( $r[0] ) . $audio . '</th><td data-label="Restricted (Class 1)">' . wp_kses_post( $r[1] ) . '</td><td data-label="Non-Restricted (Class 2)">' . wp_kses_post( $r[2] ) . '</td></tr>';
	}
	$intro = '<a class="gc__audio gc__audio--lead" href="https://georgialicenseexam.com/wp-content/uploads/2016/12/0-Audio-Help-CA-Chart-Explained-1_.43.mp3" target="_blank" rel="noopener">' . $play . 'Listen: the chart explained<span class="screen-reader-text"> (opens in a new tab)</span></a>';
	return '<div class="gc">' . $intro . '<table class="gc__table"><caption class="screen-reader-text">Applications considerations: Restricted versus Non-Restricted license</caption><thead><tr><th scope="col">Application considerations</th><th scope="col">Restricted (Class 1) license</th><th scope="col">Non-Restricted (Class 2) license</th></tr></thead><tbody>' . $rows . '</tbody></table></div>';
} );
