<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display: flex; flex-direction: column; gap: 28px;">
          <input type="hidden" name="action" value="magnolia_estimate">
          <div style="position:absolute;left:-9999px" aria-hidden="true"><label>Leave this empty <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <h2 style="font-family: Marcellus, serif; font-size: 32px; color: rgb(40, 58, 51);">Request an Estimate</h2>
            <p style="font-size: 15px; color: rgb(91, 101, 95);">Fields marked * are required.</p>
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 22px;">
            <label style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: rgb(40, 58, 51); font-weight: 500;">Full Name *
              <input required="" name="name" type="text" placeholder="Your name" style="border: 1px solid rgb(196, 198, 184); background: rgb(251, 250, 246); padding: 14px 16px; font-size: 16px; color: rgb(31, 42, 37); min-height: 48px; width: 100%; letter-spacing: 0px; text-transform: none; font-weight: 400;">
            </label>
            <label style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: rgb(40, 58, 51); font-weight: 500;">Phone *
              <input required="" name="phone" type="tel" placeholder="(336) 000-0000" style="border: 1px solid rgb(196, 198, 184); background: rgb(251, 250, 246); padding: 14px 16px; font-size: 16px; color: rgb(31, 42, 37); min-height: 48px; width: 100%; letter-spacing: 0px; text-transform: none; font-weight: 400;">
            </label>
            <label style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: rgb(40, 58, 51); font-weight: 500;">Email *
              <input required="" name="email" type="email" placeholder="you@example.com" style="border: 1px solid rgb(196, 198, 184); background: rgb(251, 250, 246); padding: 14px 16px; font-size: 16px; color: rgb(31, 42, 37); min-height: 48px; width: 100%; letter-spacing: 0px; text-transform: none; font-weight: 400;">
            </label>
            <label style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: rgb(40, 58, 51); font-weight: 500;">Property Address
              <input name="address" type="text" placeholder="Street, town, county" style="border: 1px solid rgb(196, 198, 184); background: rgb(251, 250, 246); padding: 14px 16px; font-size: 16px; color: rgb(31, 42, 37); min-height: 48px; width: 100%; letter-spacing: 0px; text-transform: none; font-weight: 400;">
            </label>
            <label style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: rgb(40, 58, 51); font-weight: 500;">I Am A
              <select name="role" style="border: 1px solid rgb(196, 198, 184); background: rgb(251, 250, 246); padding: 14px 16px; font-size: 16px; color: rgb(31, 42, 37); min-height: 48px; width: 100%; letter-spacing: 0px; text-transform: none; font-weight: 400;">
                <option>Homeowner</option><option>Second home owner</option><option>Property manager</option><option>General contractor</option><option>Real estate professional</option><option>Business owner</option>
              </select>
            </label>
            <label style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: rgb(40, 58, 51); font-weight: 500;">Timeline
              <select name="timeline" style="border: 1px solid rgb(196, 198, 184); background: rgb(251, 250, 246); padding: 14px 16px; font-size: 16px; color: rgb(31, 42, 37); min-height: 48px; width: 100%; letter-spacing: 0px; text-transform: none; font-weight: 400;">
                <option>As soon as possible</option><option>Within 1–3 months</option><option>3–6 months</option><option>Planning ahead</option>
              </select>
            </label>
          </div>
          <fieldset style="border: 0px; padding: 0px; margin: 0px; display: flex; flex-direction: column; gap: 14px;">
            <legend style="font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: rgb(40, 58, 51); font-weight: 500; padding: 0px; margin-bottom: 14px;">Services Needed</legend>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px 20px;">
              
                <label style="display: flex; align-items: center; gap: 12px; font-size: 16px; color: rgb(31, 42, 37); min-height: 32px; cursor: pointer;"><input type="checkbox" name="services[]" value="Land clearing / forestry mulching" style="width: 18px; height: 18px; accent-color: rgb(115, 130, 56); margin: 0px;">Land clearing / forestry mulching</label>
              
                <label style="display: flex; align-items: center; gap: 12px; font-size: 16px; color: rgb(31, 42, 37); min-height: 32px; cursor: pointer;"><input type="checkbox" name="services[]" value="Grading &amp; drainage" style="width: 18px; height: 18px; accent-color: rgb(115, 130, 56); margin: 0px;">Grading &amp; drainage</label>
              
                <label style="display: flex; align-items: center; gap: 12px; font-size: 16px; color: rgb(31, 42, 37); min-height: 32px; cursor: pointer;"><input type="checkbox" name="services[]" value="Retaining walls &amp; hardscape" style="width: 18px; height: 18px; accent-color: rgb(115, 130, 56); margin: 0px;">Retaining walls &amp; hardscape</label>
              
                <label style="display: flex; align-items: center; gap: 12px; font-size: 16px; color: rgb(31, 42, 37); min-height: 32px; cursor: pointer;"><input type="checkbox" name="services[]" value="Gravel driveway / culvert" style="width: 18px; height: 18px; accent-color: rgb(115, 130, 56); margin: 0px;">Gravel driveway / culvert</label>
              
                <label style="display: flex; align-items: center; gap: 12px; font-size: 16px; color: rgb(31, 42, 37); min-height: 32px; cursor: pointer;"><input type="checkbox" name="services[]" value="Landscape design &amp; install" style="width: 18px; height: 18px; accent-color: rgb(115, 130, 56); margin: 0px;">Landscape design &amp; install</label>
              
                <label style="display: flex; align-items: center; gap: 12px; font-size: 16px; color: rgb(31, 42, 37); min-height: 32px; cursor: pointer;"><input type="checkbox" name="services[]" value="Tree care" style="width: 18px; height: 18px; accent-color: rgb(115, 130, 56); margin: 0px;">Tree care</label>
              
                <label style="display: flex; align-items: center; gap: 12px; font-size: 16px; color: rgb(31, 42, 37); min-height: 32px; cursor: pointer;"><input type="checkbox" name="services[]" value="Commercial power washing" style="width: 18px; height: 18px; accent-color: rgb(115, 130, 56); margin: 0px;">Commercial power washing</label>
              
                <label style="display: flex; align-items: center; gap: 12px; font-size: 16px; color: rgb(31, 42, 37); min-height: 32px; cursor: pointer;"><input type="checkbox" name="services[]" value="Property care subscription" style="width: 18px; height: 18px; accent-color: rgb(115, 130, 56); margin: 0px;">Property care subscription</label>
              
            </div>
          </fieldset>
          <label style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: rgb(40, 58, 51); font-weight: 500;">Tell Us About the Project
            <textarea name="details" rows="5" placeholder="Acreage, current condition, what you'd like the finished property to look like, access notes…" style="border: 1px solid rgb(196, 198, 184); background: rgb(251, 250, 246); padding: 14px 16px; font-size: 16px; color: rgb(31, 42, 37); width: 100%; resize: vertical; letter-spacing: 0px; text-transform: none; font-weight: 400; line-height: 1.5;"></textarea>
          </label>
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 20px;">
            <button type="submit" class="scp1" style="background: rgb(115, 130, 56); color: rgb(244, 242, 234); border: 0px; padding: 18px 34px; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 500; cursor: pointer; min-height: 52px;">Send Request</button>
            <p style="font-size: 14px; color: rgb(91, 101, 95);">Or call <a href="tel:3365839398" style="color: rgb(40, 58, 51); font-weight: 500;">(336) 583-9398</a></p>
          </div>
        </form>
