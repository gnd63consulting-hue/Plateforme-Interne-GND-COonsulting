
jQuery(document).ready(function() {
	jQuery('form#contact_form_15864381891641415980').submit(function() {
		jQuery('form#contact_form_15864381891641415980 .error').remove();
		var hasError = false;
		jQuery('.required_field').each(function() {
			if(jQuery.trim(jQuery(this).val()) == '') {
				var labelText = jQuery(this).prev('label').text();
				jQuery('#reponse_msg_15864381891641415980 ul').append('<li class="error">Please enter '+labelText+'</li>');
				hasError = true;
			} else if(jQuery(this).hasClass('email')) {
				var emailReg = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
				if(!emailReg.test(jQuery.trim(jQuery(this).val()))) {
					var labelText = jQuery(this).prev('label').text();
					jQuery('#reponse_msg_15864381891641415980 ul').append('<li class="error">Please enter valid '+labelText+'</li>');
					hasError = true;
				}
			}
		});
		if(!hasError) {
			var contactData = jQuery('#contact_form_15864381891641415980').serialize();

			 			jQuery('#contact_submit_btn15864381891641415980').fadeOut('normal', function() {
				jQuery(this).parent().append('<i class="fa fa-circle-o-notch fa-spin"></i>');
			});
 			
 			jQuery.ajax({
			    type: 'POST',
			    url: tgAjax.ajaxurl,
			    data: contactData+'&tg_security='+tgAjax.ajax_nonce,
			    success: function(results){
			    	jQuery('#contact_form_15864381891641415980').hide();
			    	jQuery('#reponse_msg_15864381891641415980').html(results);
			    }
			});
 					}
		
		return false;
		
	});
});