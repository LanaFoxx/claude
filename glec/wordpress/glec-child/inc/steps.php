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
		[ 'id' => 'license', 'title' => 'Which license fits you?', 'task' => 'Decide whether you want, and meet the requirements for, the Restricted (Class 1) or the Non-Restricted (Class 2) license.',
		  'type' => 'choose',
		  'options' => [
			[ 'value' => 'restricted', 'label' => 'Restricted (Class 1)', 'sub' => 'Units 5 tons or less cooling, 175,000 Btuh or less heating. 4+ years of experience.' ],
			[ 'value' => 'nonrestricted', 'label' => 'Non-Restricted (Class 2)', 'sub' => 'All unit sizes. 5+ years of experience, with over 50% of your projects on units over 5 tons.' ],
			[ 'value' => 'unsure', 'label' => 'I am not sure yet', 'sub' => 'Compare the requirements side by side first.' ],
		  ],
		  'need' => [ 'text' => 'Compare the experience, reference, education and document requirements for each license in the Applications Considerations Chart, then come back and choose.', 'cta' => 'Open the comparison chart', 'url' => '#chart' ] ],
		[ 'id' => 'epa', 'title' => 'EPA-608 technician certification', 'task' => 'You need EPA-608 technician certification, Type 2 or higher, in your application package.',
		  'need' => [ 'text' => 'Get certified first. NATE offers remotely monitored online testing for EPA-608, and there are paper testing options in Atlanta.', 'cta' => 'See technician certifications', 'url' => $h . 'technician-certifications/' ] ],
		[ 'id' => 'resdesign', 'title' => 'Residential Design Class', 'task' => 'The Residential Heat Loss/Gain &amp; Duct Design Class (ACCA Manuals J &amp; D). Its certificate of completion is required for every license application.',
		  'need' => [ 'text' => 'Read the full class details, add the class to your cart, accept the terms and conditions, and purchase the class.', 'cta' => 'See the Residential Design Class', 'url' => $h . 'license-classes/residential-design/', 'sku' => 'HLG-DD-R-OL' ] ],
		[ 'id' => 'comdesign', 'title' => 'Commercial Design Class', 'task' => 'The Commercial Heat Loss/Gain &amp; Duct Design Class (Carrier System Design Manuals 1, 2 and 3). Required for the Non-Restricted license only.',
		  'skipif' => 'restricted', 'skipnote' => 'Not required for the Restricted (Class 1) license, so you can skip this step.',
		  'need' => [ 'text' => 'Read the full class details and purchase the Commercial Design Class.', 'cta' => 'See the Commercial Design Class', 'url' => $h . 'license-classes/commercial-design/', 'sku' => 'HLG-DD-C-OL' ] ],
		[ 'id' => 'designbooks', 'title' => 'Reference books for the design classes', 'task' => 'You buy the reference books for the design classes separately.',
		  'need' => [ 'text' => 'You can buy them anywhere, but this is a one-stop shop with the books in stock.', 'cta' => 'Order the reference books', 'url' => $books, 'ext' => true ] ],
		[ 'id' => 'forms', 'title' => 'Complete all the required forms', 'task' => 'Application, references, transcripts, background check, certificates, IDs and payment. The application process is on the Board&rsquo;s website, called <a href="https://sos.ga.gov/goals" target="_blank" rel="noopener">GOALS</a>.',
		  'need' => [ 'text' => 'The Application Overview videos walk you through every document and section, with two checklists. They are included free with the design classes.', 'cta' => 'See the Application Overview videos', 'url' => $h . 'license-classes/application-overview/', 'sku' => 'SOS-APP' ] ],
		[ 'id' => 'approval', 'title' => 'Approval from the Board to take the exam', 'task' => 'Receive approval from the Conditioned Air License Board to sit for the exam.',
		  'need' => [ 'text' => 'Once approved, PSI emails you instructions to schedule your exam. Pay PSI before the deadline to take the exam.', 'cta' => 'See the Board application process', 'url' => $h . 'board-application/', 'cta2' => 'Go to PSI Exams', 'url2' => 'https://www.psiexams.com', 'ext2' => true ] ],
		[ 'id' => 'examprep', 'title' => 'Exam Prep Review Class', 'task' => 'The Conditioned Air license exam prep review class: the traditional license exam prep review class.',
		  'need' => [ 'text' => 'Buy this class once you are approved by the Board. It ships a printed study guide and covers every reference book except Manuals J &amp; D.', 'cta' => 'See the Exam Prep Review Class', 'url' => $h . 'license-classes/exam-prep-review/', 'sku' => 'CA-OL' ] ],
		[ 'id' => 'exambooks', 'title' => 'Reference books for the exam prep class', 'task' => 'You buy the reference books for the Conditioned Air exam prep class separately.',
		  'need' => [ 'text' => 'You can buy them anywhere, but this is a one-stop shop with the books in stock. Do not forget the permanent reference tabs.', 'cta' => 'Order the reference books', 'url' => $books, 'ext' => true, 'cta2' => 'See the reference tabs', 'url2' => $h . 'license-classes/reference-tabs/' ] ],
		[ 'id' => 'licensed', 'title' => 'Get your pass/fail document', 'task' => 'Get your pass/fail document at the PSI exam site, then check GOALS online to find your license number.',
		  'have' => 'I have my pass/fail document', 'needlabel' => 'Not yet',
		  'need' => [ 'text' => 'After your exam, get your pass/fail document from PSI. Then check GOALS online for your license number, and print your license on the Secretary of State website.', 'cta' => 'Go to PSI Exams', 'url' => 'https://www.psiexams.com', 'ext' => true, 'cta2' => 'Print your license at sos.ga.gov', 'url2' => 'https://sos.ga.gov', 'ext2' => true ] ],
	];
	foreach ( $steps as &$s ) {
		if ( ! empty( $s['need']['sku'] ) && function_exists( 'glec_sku_price' ) ) { $s['need']['price'] = glec_sku_price( $s['need']['sku'] ); }
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
		$out .= '<li class="gwr__step" id="step-' . $num . '"><div class="gwr__head"><span class="gwr__k">Step ' . $num . ' of ' . count( $steps ) . '</span><a class="gwr__open" href="' . esc_url( add_query_arg( 'step', $num, $base ) ) . '">Open this step in the guide</a></div>';
		$out .= '<h2 class="gwr__title">' . esc_html( html_entity_decode( $st['title'] ) ) . '</h2><p class="gwr__task">' . wp_kses_post( $st['task'] ) . '</p>';
		if ( ! empty( $st['options'] ) ) {
			$out .= '<p class="gwr__label">Answer options</p><ul class="gwr__opts">';
			foreach ( $st['options'] as $o ) { $out .= '<li><b>' . esc_html( $o['label'] ) . '</b><span>' . esc_html( $o['sub'] ) . '</span></li>'; }
			$out .= '</ul>';
		} else {
			$out .= '<p class="gwr__label">Answer options</p><ul class="gwr__opts"><li><b>' . esc_html( $st['have'] ?? 'I have this' ) . '</b><span>' . ( $num < count( $steps ) ? 'Go to step ' . ( $num + 1 ) : 'Finish' ) . '</span></li><li><b>' . esc_html( $st['needlabel'] ?? 'I need this' ) . '</b><span>Show me what to do</span></li></ul>';
		}
		if ( ! empty( $st['skipnote'] ) ) { $out .= '<p class="gwr__label">Shown instead for Restricted (Class 1)</p><div class="gwr__skip">' . wp_kses_post( $st['skipnote'] ) . '</div>'; }
		$out .= '<p class="gwr__label">' . ( ! empty( $st['options'] ) ? 'If they choose "I am not sure yet"' : 'If they choose "' . esc_html( $st['needlabel'] ?? 'I need this' ) . '"' ) . '</p><div class="gwr__need"><p class="gwr__needt">Here is what to do</p><p>' . wp_kses_post( $n['text'] ) . '</p>';
		if ( ! empty( $n['price'] ) ) { $out .= '<p class="gwr__price">' . esc_html( $n['price'] ) . '</p>'; }
		$out .= '<p class="gwr__ctas"><a href="' . esc_url( $n['url'] ) . '"' . ( ! empty( $n['ext'] ) ? ' target="_blank" rel="noopener"' : '' ) . '>' . esc_html( $n['cta'] ) . ( ! empty( $n['ext'] ) ? $ext : '' ) . '</a>';
		if ( ! empty( $n['cta2'] ) ) { $out .= '<a href="' . esc_url( $n['url2'] ) . '"' . ( ! empty( $n['ext2'] ) ? ' target="_blank" rel="noopener"' : '' ) . '>' . esc_html( $n['cta2'] ) . ( ! empty( $n['ext2'] ) ? $ext : '' ) . '</a>'; }
		$out .= '</p></div></li>';
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
		[ 'Required design class: Residential Design (heat loss/gain &amp; duct design)', 'ACT-107 or AIRC-1060 at any TCSG (Technical College System of Georgia) school, though TCSG schools do not teach it as an exam prep class. Or the <a href="' . esc_url( home_url( '/license-classes/residential-design/' ) ) . '">GLEC HLG-DD-R-OL Residential Design Class</a>. Submit the certificate of completion with your application.', 'ACT-107 or AIRC-1060 at any TCSG school, though TCSG schools do not teach it as an exam prep class. Or the <a href="' . esc_url( home_url( '/license-classes/residential-design/' ) ) . '">GLEC HLG-DD-R-OL Residential Design Class</a>. Submit the certificate of completion with your application.', $a . '9-Audio-Help-CA-Res-Design-2_49.mp3' ],
		[ 'Commercial Design (heat loss/gain &amp; duct design, online)', 'Not required', 'Required: the <a href="' . esc_url( home_url( '/license-classes/commercial-design/' ) ) . '">GLEC HLG-DD-C-OL Commercial Design Class</a>. Submit the certificate of completion with your application.', $a . '10-Audio-Help-CA-Comm-Design-0_48.mp3' ],
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
