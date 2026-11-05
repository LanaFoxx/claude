/**
 * CTC head scripts (Code Snippets, scope: front-end). Moved from Header Footer Code Manager (Nov 2026):
 *  - Google Analytics 4 tag (G-1Z345NXR1E) on every page. The gtag library itself is loaded by the CTC Speed snippet on the
 *    visitor's first interaction (window.ctcLoadGA); page views queued before that are sent when it loads.
 *  - Schema.org WebPage markup on the homepage (page 65) and the 60 Hour course product (post 76)
 */
add_action( 'wp_head', function () {
	if ( is_admin() ) return;
	echo '<!-- Google tag (gtag.js) -->
<script>window.ctcLoadGA=function(){if(window.ctcGA)return;window.ctcGA=1;var s=document.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtag/js?id=G-1Z345NXR1E";document.head.appendChild(s);};</script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag(\'js\', new Date());

  gtag(\'config\', \'G-1Z345NXR1E\');
</script>' . "
";
	if ( is_front_page() || is_page( 65 ) ) echo '<script type="application/ld+json">

{
"@context":"https://schema.org",
"@type":"WebPage",
"headline":"CTEC Courses - California Tax Courses",
"url":"https://cataxcourses.com/",
"about":

[{"@type": "thing", "name": "irs", "sameAs": ["http://en.wikipedia.org/wiki/Internal_Revenue_Service",
"https://www.google.com/search?q=irs&kgmid=/m/03z19"]},
{"@type": "thing", "name": "ethics", "sameAs": ["http://en.wikipedia.org/wiki/Ethics",
"https://www.google.com/search?q=ethics&kgmid=/m/01b_f9"]},
{"@type": "thing", "name": "federal tax", "sameAs": ["http://en.wikipedia.org/wiki/Taxation_in_the_United_States",
"https://www.google.com/search?q=federal+tax&kgmid=/m/07j1r"]},
{"@type": "thing", "name": "taxes", "sameAs": ["http://en.wikipedia.org/wiki/Tax",
"https://www.google.com/search?q=taxes&kgmid=/m/07g82"]},
{"@type": "thing", "name": "tax preparers", "sameAs": ["http://en.wikipedia.org/wiki/Tax_preparation_in_the_United_States",
"https://www.google.com/search?q=tax+preparers&kgmid=/m/0f5mbk"]},
{"@type": "thing", "name": "online", "sameAs": ["http://en.wikipedia.org/wiki/Online_and_offline",
"https://www.google.com/search?q=online&kgmid=/m/0bcp7"]},
{"@type": "thing", "name": "cpe", "sameAs": ["http://en.wikipedia.org/wiki/Customer-premises_equipment",
"https://www.google.com/search?q=cpe&kgmid=/m/0b732"]},
{"@type": "thing", "name": "california state", "sameAs": ["http://en.wikipedia.org/wiki/California",
"https://www.google.com/search?q=california+state&kgmid=/m/01n7q"]},
{"@type": "thing", "name": "license", "sameAs": ["http://en.wikipedia.org/wiki/License",
"https://www.google.com/search?q=license&kgmid=/m/0b25v"]},
{"@type": "thing", "name": "exam", "sameAs": ["http://en.wikipedia.org/wiki/Test_(assessment)",
"https://www.google.com/search?q=exam&kgmid=/m/03620t"]},
{"@type": "thing", "name": "income", "sameAs": ["http://en.wikipedia.org/wiki/Income",
"https://www.google.com/search?q=income&kgmid=/m/03wj0"]},
{"@type": "thing", "name": "clients", "sameAs": ["http://en.wikipedia.org/wiki/Customer",
"https://www.google.com/search?q=clients&kgmid=/m/01j0mk"]},
{"@type": "thing", "name": "income tax", "sameAs": ["http://en.wikipedia.org/wiki/Income_tax",
"https://www.google.com/search?q=income+tax&kgmid=/m/0df75"]},
{"@type": "thing", "name": "state of california", "sameAs": ["http://en.wikipedia.org/wiki/California",
"https://www.google.com/search?q=state+of+california&kgmid=/m/01n7q"]},
{"@type": "thing", "name": "california", "sameAs": ["http://en.wikipedia.org/wiki/California",
"https://www.google.com/search?q=california&kgmid=/m/01n7q"]},
{"@type": "thing", "name": "tax", "sameAs": ["http://en.wikipedia.org/wiki/Tax",
"https://www.google.com/search?q=tax&kgmid=/m/07g82"]},
{"@type": "thing", "name": "translation", "sameAs": ["http://en.wikipedia.org/wiki/Translation",
"https://www.google.com/search?q=translation&kgmid=/m/010xb292"]},
{"@type": "thing", "name": "law", "sameAs": ["http://en.wikipedia.org/wiki/Law",
"https://www.google.com/search?q=law&kgmid=/m/04gb7"]},
{"@type": "thing", "name": "education", "sameAs": ["http://en.wikipedia.org/wiki/Education",
"https://www.google.com/search?q=education&kgmid=/m/0vpr1nh"]},
{"@type": "thing", "name": "ptin", "sameAs": ["http://en.wikipedia.org/wiki/Preparer_Tax_Identification_Number",
"https://www.google.com/search?q=ptin&kgmid=/m/0fphsdg"]}],

"mentions":

[{"@type": "thing", "name": "internal revenue service", "sameAs": ["http://en.wikipedia.org/wiki/Internal_Revenue_Service",
"https://www.google.com/search?q=internal+revenue+service&kgmid=/m/03z19"]},
{"@type": "thing", "name": "tax preparers", "sameAs": ["http://en.wikipedia.org/wiki/Tax_preparation_in_the_United_States",
"https://www.google.com/search?q=tax+preparers&kgmid=/m/0f5mbk"]},
{"@type": "thing", "name": "enrolled agents", "sameAs": ["http://en.wikipedia.org/wiki/Enrolled_agent",
"https://www.google.com/search?q=enrolled+agents&kgmid=/m/078nwb"]},
{"@type": "thing", "name": "tax preparation software", "sameAs": ["http://en.wikipedia.org/wiki/Tax_preparation_in_the_United_States",
"https://www.google.com/search?q=tax+preparation+software&kgmid=/m/0f5mbk"]},
{"@type": "thing", "name": "deductions", "sameAs": ["http://en.wikipedia.org/wiki/Tax_deduction",
"https://www.google.com/search?q=deductions&kgmid=/m/01rqfh"]},
{"@type": "thing", "name": "tax law", "sameAs": ["http://en.wikipedia.org/wiki/Taxation_in_the_United_States",
"https://www.google.com/search?q=tax+law&kgmid=/m/07j1r"]},
{"@type": "thing", "name": "form 1040", "sameAs": ["http://en.wikipedia.org/wiki/Form_1040",
"https://www.google.com/search?q=form+1040&kgmid="]},
{"@type": "thing", "name": "california tax education council (ctec)", "sameAs": ["http://en.wikipedia.org/wiki/California_Tax_Education_Council",
"https://www.google.com/search?q=california+tax+education+council+(ctec)&kgmid=/m/0h56gvx"]},
{"@type": "thing", "name": "llcs", "sameAs": ["http://en.wikipedia.org/wiki/Limited_liability_company",
"https://www.google.com/search?q=llcs&kgmid=/m/01prdc"]},
{"@type": "thing", "name": "tax forms", "sameAs": ["http://en.wikipedia.org/wiki/IRS_tax_forms",
"https://www.google.com/search?q=tax+forms&kgmid=/m/027vqbt"]},
{"@type": "thing", "name": "cpa", "sameAs": ["http://en.wikipedia.org/wiki/Certified_Public_Accountant",
"https://www.google.com/search?q=cpa&kgmid=/m/019n1v"]},
{"@type": "thing", "name": "income tax returns", "sameAs": ["http://en.wikipedia.org/wiki/Tax_return_(United_States)",
"https://www.google.com/search?q=income+tax+returns&kgmid=/m/02kcdd"]},
{"@type": "thing", "name": "accounting", "sameAs": ["http://en.wikipedia.org/wiki/Accounting",
"https://www.google.com/search?q=accounting&kgmid=/m/0_jm"]},
{"@type": "thing", "name": "ptin", "sameAs": ["http://en.wikipedia.org/wiki/Preparer_Tax_Identification_Number",
"https://www.google.com/search?q=ptin&kgmid=/m/0fphsdg"]},
{"@type": "thing", "name": "expenses", "sameAs": ["http://en.wikipedia.org/wiki/Expense",
"https://www.google.com/search?q=expenses&kgmid=/m/01n9ps"]},
{"@type": "thing", "name": "accountants", "sameAs": ["http://en.wikipedia.org/wiki/Accountant",
"https://www.google.com/search?q=accountants&kgmid=/m/025tmkg"]},
{"@type": "thing", "name": "schedule c", "sameAs": ["http://en.wikipedia.org/wiki/IRS_tax_forms",
"https://www.google.com/search?q=schedule+c&kgmid=/m/027vqbt"]},
{"@type": "thing", "name": "tax preparation", "sameAs": ["http://en.wikipedia.org/wiki/Tax_preparation_in_the_United_States",
"https://www.google.com/search?q=tax+preparation&kgmid=/m/0f5mbk"]}]
}

</script>' . "
";
	if ( is_singular() && 76 === (int) get_queried_object_id() ) echo '<script type="application/ld+json">

{
"@context":"https://schema.org",
"@type":"WebPage",
"@id": "https://cataxcourses.com/product/ctec-60-hours-course/#webpage",
"headline":"CTEC 60 Hour Course - California Tax Courses Qualifying Education",
"url":"https://cataxcourses.com/product/ctec-60-hours-course/",
"about":

[{"@type": "thing", "name": "tax", "sameAs": ["http://en.wikipedia.org/wiki/Tax",
"https://www.google.com/search?q=tax&kgmid=/m/07g82"]},
{"@type": "thing", "name": "taxpayer", "sameAs": ["http://en.wikipedia.org/wiki/Taxpayer",
"https://www.google.com/search?q=taxpayer&kgmid=/m/04q01rd"]},
{"@type": "thing", "name": "irs", "sameAs": ["http://en.wikipedia.org/wiki/Internal_Revenue_Service",
"https://www.google.com/search?q=irs&kgmid=/m/03z19"]},
{"@type": "thing", "name": "income", "sameAs": ["http://en.wikipedia.org/wiki/Income",
"https://www.google.com/search?q=income&kgmid=/m/03wj0"]},
{"@type": "thing", "name": "taxes", "sameAs": ["http://en.wikipedia.org/wiki/Tax",
"https://www.google.com/search?q=taxes&kgmid=/m/07g82"]},
{"@type": "thing", "name": "exam", "sameAs": ["http://en.wikipedia.org/wiki/Test_(assessment)",
"https://www.google.com/search?q=exam&kgmid=/m/03620t"]},
{"@type": "thing", "name": "online", "sameAs": ["http://en.wikipedia.org/wiki/Online_and_offline",
"https://www.google.com/search?q=online&kgmid=/m/0bcp7"]},
{"@type": "thing", "name": "ethics", "sameAs": ["http://en.wikipedia.org/wiki/Ethics",
"https://www.google.com/search?q=ethics&kgmid=/m/01b_f9"]},
{"@type": "thing", "name": "state of california", "sameAs": ["http://en.wikipedia.org/wiki/California",
"https://www.google.com/search?q=state+of+california&kgmid=/m/01n7q"]},
{"@type": "thing", "name": "capital", "sameAs": ["http://en.wikipedia.org/wiki/Capital_(economics)",
"https://www.google.com/search?q=capital&kgmid=/m/018s5w"]},
{"@type": "thing", "name": "california", "sameAs": ["http://en.wikipedia.org/wiki/California",
"https://www.google.com/search?q=california&kgmid=/m/01n7q"]},
{"@type": "thing", "name": "itemized deductions", "sameAs": ["http://en.wikipedia.org/wiki/Itemized_deduction",
"https://www.google.com/search?q=itemized+deductions&kgmid=/m/01rqtm"]},
{"@type": "thing", "name": "ptin", "sameAs": ["http://en.wikipedia.org/wiki/Preparer_Tax_Identification_Number",
"https://www.google.com/search?q=ptin&kgmid=/m/0fphsdg"]},
{"@type": "thing", "name": "education", "sameAs": ["http://en.wikipedia.org/wiki/Education",
"https://www.google.com/search?q=education&kgmid=/m/0vpr1nh"]},
{"@type": "thing", "name": "depreciation", "sameAs": ["http://en.wikipedia.org/wiki/Depreciation",
"https://www.google.com/search?q=depreciation&kgmid=/m/01qm84"]},
{"@type": "thing", "name": "tax law", "sameAs": ["http://en.wikipedia.org/wiki/Tax_law",
"https://www.google.com/search?q=tax+law&kgmid=/m/07pff"]},
{"@type": "thing", "name": "assets", "sameAs": ["http://en.wikipedia.org/wiki/Asset",
"https://www.google.com/search?q=assets&kgmid=/m/0z1j"]},
{"@type": "thing", "name": "law", "sameAs": ["http://en.wikipedia.org/wiki/Law",
"https://www.google.com/search?q=law&kgmid=/m/04gb7"]}],

"mentions":

[{"@type": "thing", "name": "federal tax", "sameAs": ["http://en.wikipedia.org/wiki/Taxation_in_the_United_States",
"https://www.google.com/search?q=federal+tax&kgmid=/m/07j1r"]},
{"@type": "thing", "name": "depreciation methods", "sameAs": ["http://en.wikipedia.org/wiki/Depreciation",
"https://www.google.com/search?q=depreciation+methods&kgmid=/m/01qm84"]},
{"@type": "thing", "name": "tax system", "sameAs": ["http://en.wikipedia.org/wiki/Tax",
"https://www.google.com/search?q=tax+system&kgmid=/m/07g82"]},
{"@type": "thing", "name": "taxation", "sameAs": ["http://en.wikipedia.org/wiki/Tax",
"https://www.google.com/search?q=taxation&kgmid=/m/07g82"]},
{"@type": "thing", "name": "enrolled agent", "sameAs": ["http://en.wikipedia.org/wiki/Enrolled_agent",
"https://www.google.com/search?q=enrolled+agent&kgmid=/m/078nwb"]},
{"@type": "thing", "name": "alternative minimum tax", "sameAs": ["http://en.wikipedia.org/wiki/Alternative_minimum_tax",
"https://www.google.com/search?q=alternative+minimum+tax&kgmid=/m/01r3r4"]},
{"@type": "thing", "name": "income taxes", "sameAs": ["http://en.wikipedia.org/wiki/Income_tax_in_the_United_States",
"https://www.google.com/search?q=income+taxes&kgmid=/m/08tr_2"]},
{"@type": "thing", "name": "deduction", "sameAs": ["http://en.wikipedia.org/wiki/Tax_deduction",
"https://www.google.com/search?q=deduction&kgmid=/m/01rqfh"]},
{"@type": "thing", "name": "tax preparers", "sameAs": ["http://en.wikipedia.org/wiki/Tax_preparation_in_the_United_States",
"https://www.google.com/search?q=tax+preparers&kgmid=/m/0f5mbk"]},
{"@type": "thing", "name": "tax returns", "sameAs": ["http://en.wikipedia.org/wiki/Tax_return_(United_States)",
"https://www.google.com/search?q=tax+returns&kgmid=/m/02kcdd"]},
{"@type": "thing", "name": "form 1040", "sameAs": ["http://en.wikipedia.org/wiki/Form_1040",
"https://www.google.com/search?q=form+1040&kgmid="]},
{"@type": "thing", "name": "roth iras", "sameAs": ["http://en.wikipedia.org/wiki/Roth_IRA",
"https://www.google.com/search?q=roth+iras&kgmid=/m/023_lp"]},
{"@type": "thing", "name": "itemized deductions", "sameAs": ["http://en.wikipedia.org/wiki/Itemized_deduction",
"https://www.google.com/search?q=itemized+deductions&kgmid=/m/01rqtm"]},
{"@type": "thing", "name": "depreciation", "sameAs": ["http://en.wikipedia.org/wiki/Depreciation",
"https://www.google.com/search?q=depreciation&kgmid=/m/01qm84"]},
{"@type": "thing", "name": "capital gain", "sameAs": ["http://en.wikipedia.org/wiki/Capital_gain",
"https://www.google.com/search?q=capital+gain&kgmid=/m/01r_d8"]},
{"@type": "thing", "name": "preparer tax identification number", "sameAs": ["http://en.wikipedia.org/wiki/Preparer_Tax_Identification_Number",
"https://www.google.com/search?q=preparer+tax+identification+number&kgmid=/m/0fphsdg"]},
{"@type": "thing", "name": "tax preparation software", "sameAs": ["http://en.wikipedia.org/wiki/Tax_preparation_in_the_United_States",
"https://www.google.com/search?q=tax+preparation+software&kgmid=/m/0f5mbk"]},
{"@type": "thing", "name": "tax preparation", "sameAs": ["http://en.wikipedia.org/wiki/Tax_preparation_in_the_United_States",
"https://www.google.com/search?q=tax+preparation&kgmid=/m/0f5mbk"]},
{"@type": "thing", "name": "goodwill", "sameAs": ["http://en.wikipedia.org/wiki/Goodwill_(accounting)",
"https://www.google.com/search?q=goodwill&kgmid=/m/025yjnl"]},
{"@type": "thing", "name": "iras", "sameAs": ["http://en.wikipedia.org/wiki/Individual_retirement_account",
"https://www.google.com/search?q=iras&kgmid=/m/023z_z"]},
{"@type": "thing", "name": "sole proprietor", "sameAs": ["http://en.wikipedia.org/wiki/Sole_proprietorship",
"https://www.google.com/search?q=sole+proprietor&kgmid=/m/0319xp"]},
{"@type": "thing", "name": "tax law", "sameAs": ["http://en.wikipedia.org/wiki/Taxation_in_the_United_States",
"https://www.google.com/search?q=tax+law&kgmid=/m/07j1r"]},
{"@type": "thing", "name": "tax-exempt", "sameAs": ["http://en.wikipedia.org/wiki/Tax_exemption",
"https://www.google.com/search?q=tax-exempt&kgmid=/m/03tk8v"]},
{"@type": "thing", "name": "tcja", "sameAs": ["http://en.wikipedia.org/wiki/Tax_Cuts_and_Jobs_Act_of_2017",
"https://www.google.com/search?q=tcja&kgmid="]}]
}

</script>' . "
";
}, 1 );
