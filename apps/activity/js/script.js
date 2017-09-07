/*
 * Copyright (c) 2015
 *
 * This file is licensed under the Affero General Public License version 3
 * or later.
 *
 * See the COPYING-README file.
 *
 */
$(function(){
	var OCActivity={};

	OCActivity.Filter = {
		filter: undefined,
		currentPage: 0,
		navigation: $('#app-navigation'),


		_onPopState: function(params) {
			params = _.extend({
				filter: 'all'
			}, params);

			this.setFilter(params.filter);
		},

		setFilter: function (filter) {
			if (filter === this.filter) {
				return;
			}

			if (filter.indexOf('fileList') !== -1) {
					if (filter === 'fileList') {
						window.location.href = OCActivity.Filter.navigation.context.URL.replace(/activity\/\?[a-zA-Z]*=[a-zA-Z]*/g, 'files');
						return;
					} 
					else {
						var links = OCActivity.Filter.filter.replace('fileList-', '');
						window.location.href = OCActivity.Filter.navigation.context.URL.replace(/activity\/\?[a-zA-Z]*=[a-zA-Z]*\-/g, 'files?view=');
						return;
					}
			}


			this.navigation.find('a[data-navigation=' + this.filter + ']').parent().removeClass('active');
			this.currentPage = 0;

			this.filter = filter;

			OCActivity.InfinitScrolling.container.animate({ scrollTop: 0 }, 'slow');
			OCActivity.InfinitScrolling.container.children().remove();
			$('#emptycontent').addClass('hidden');
			$('#no_more_activities').addClass('hidden');
			$('#loading_activities').removeClass('hidden');
			OCActivity.InfinitScrolling.ignoreScroll = false;

			this.navigation.find('a[data-navigation=' + filter + ']').parent().addClass('active');

			OCActivity.InfinitScrolling.prefill();
		}
	};

	OCActivity.InfinitScrolling = {
		ignoreScroll: false,
		container: $('#container'),
		lastDateGroup: null,
		content: $('#app-content'),

		prefill: function () {
			if (this.content.scrollTop() + this.content.height() > this.container.height() - 100) {
				OCActivity.Filter.currentPage++;

				$.get(
					OC.generateUrl('/apps/activity/activities/fetch'),
					'filter=' + OCActivity.Filter.filter + '&page=' + OCActivity.Filter.currentPage,
					function (data) {
						OCActivity.InfinitScrolling.handleActivitiesCallback(data);
					}
				);
			}
		},

		onScroll: function () {
			if (!OCActivity.InfinitScrolling.ignoreScroll && OCActivity.InfinitScrolling.content.scrollTop() +
			 OCActivity.InfinitScrolling.content.height() > OCActivity.InfinitScrolling.container.height() - 100) {
				OCActivity.Filter.currentPage++;

				$.get(
					OC.generateUrl('/apps/activity/activities/fetch'),
					'filter=' + OCActivity.Filter.filter + '&page=' + OCActivity.Filter.currentPage,
					function (data) {
						OCActivity.InfinitScrolling.handleActivitiesCallback(data);
				    OCActivity.InfinitScrolling.ignoreScroll = !data.length;
					}
				);
			}
		},

		handleActivitiesCallback: function (data) {
			var $numActivities = data.length;
      var button = $('<button class="showORhide_activity">').attr({'data-value': 'show'}).text(t('activity','show more activity data'));

			if ($numActivities > 0) {
				for (var i = 0; i < data.length; i++) {
					var $activity = data[i];
					this.appendActivityToContainer($activity);
        }

				// Continue prefill
				this.prefill();
         
        if(OCActivity.Filter.currentPage >= 0) {
          

          $('.activity-section').each(function() {
            var boxLength = $(this).find('.box').length + $(this).find('.box:hidden').length;
            var hasButton  = $(this).find('.showORhide_activity').length ? true :false;
            var boxGroup = $('<div class="boxGroup">');
            
            if(!$(this).find('.boxGroup').length) {
              $(this).find('.boxcontainer').after(boxGroup);
            }
            
            $(this).find('.boxGroup').append($(this).find('.box'));

            if(boxLength > 10) {
              !hasButton && $(this).append(button.clone());
               
              $(this).find('.box').each(function(index) {
                index >= 10 && $(this).hide();
              });
            }
            
          });
        }

			} else if (OCActivity.Filter.currentPage == 1) {
				// First page is empty - No activities :(
				var $emptyContent = $('#emptycontent');
				$emptyContent.removeClass('hidden');
				if (OCActivity.Filter.filter == 'all') {
					$emptyContent.find('p').text(t('activity', 'This stream will show events like additions, changes & shares'));
				} else {
					$emptyContent.find('p').text(t('activity', 'There are no events for this filter'));
				}
				$('#loading_activities').addClass('hidden');

			} else {
				// Page is empty - No more activities :(
				$('#no_more_activities').removeClass('hidden');
				$('#loading_activities').addClass('hidden');
			}
		},

		appendActivityToContainer: function ($activity) {
			this.makeSureDateGroupExists($activity.relativeTimestamp, $activity.readableTimestamp);
			this.addActivity($activity);
		},

		makeSureDateGroupExists: function($relativeTimestamp, $readableTimestamp) {
			var $lastGroup = this.container.children().last();

			if ($lastGroup.data('date') !== $relativeTimestamp) {
				var $content = '<div class="section activity-section group" data-date="' + escapeHTML($relativeTimestamp) + '">' + "\n"
					+'	<h2>'+"\n"
					+'		<span>' + escapeHTML($readableTimestamp) + '</span>' + "\n"
					+'	</h2>' + "\n"
					+'	<div class="boxcontainer">' + "\n"
					+'	</div>' + "\n"
					+'</div>';
				$content = $($content);
				OCActivity.InfinitScrolling.processElements($content);
				this.container.append($content);
				this.lastDateGroup = $content;
			}
		},

		addActivity: function($activity) {
      var readableDayTimestamp = String($activity.readableDateTimestamp).split(" ")[1];
      //console.dir(readableDayTimestamp[1]);
			var $content = ''
				+ '<div class="box">' + "\n"
				+ '	<div class="messagecontainer">' + "\n"

				+ '		<div class="activity-icon ' + (($activity.typeicon) ? escapeHTML($activity.typeicon) + ' svg' : '') + '"></div>' + "\n"

				+ '		<div class="activitysubject">' + "\n"
				+ (($activity.link) ? '			<a href="' + $activity.link + '">' + "\n" : '')
				+ '			' + $activity.subjectformatted.markup.trimmed + "\n"
				+ (($activity.link) ? '			</a>' + "\n" : '')
				+ '		</div>' + "\n"

				+'		<span class="activitytime">' + "\n"
				+ '			' + escapeHTML(readableDayTimestamp) + "\n"
				+'		</span>' + "\n";

			if ($activity.message) {
				$content += '<div class="activitymessage">' + "\n"
					+ $activity.messageformatted.markup.trimmed + "\n"
					+'</div>' + "\n";
			}

			

			$content += '	</div>' + "\n"
				+'</div>';

			$content = $($content);
			OCActivity.InfinitScrolling.processElements($content);
			this.lastDateGroup.append($content);
		},

		processElements: function (parentElement) {
			$(parentElement).find('.avatar').each(function() {
				var element = $(this);
				element.avatar(element.data('user'), 28);
			});

			$(parentElement).find('.has-tooltip').tooltip({
				placement: 'bottom'
			})
		}
	};

	OC.Util.History.addOnPopStateHandler(_.bind(OCActivity.Filter._onPopState, OCActivity.Filter));
	OCActivity.Filter.setFilter(OCActivity.InfinitScrolling.container.attr('data-activity-filter'));
  OCActivity.InfinitScrolling.content.on('scroll', OCActivity.InfinitScrolling.onScroll);

	OCActivity.Filter.navigation.find('a[data-navigation]').on('click', function (event) {
		var filter = $(this).attr('data-navigation');
		if (filter !== OCActivity.Filter.filter) {
			OC.Util.History.pushState({
				filter: filter
			});
		}
		OCActivity.Filter.setFilter(filter);
		event.preventDefault();
	});

	$('#enable_rss').change(function () {
		if (this.checked) {
			$('#rssurl').removeClass('hidden');
		} else {
			$('#rssurl').addClass('hidden');
		}
		$.post(OC.generateUrl('/apps/activity/settings/feed'), 'enable=' + this.checked, function(response) {
			$('#rssurl').val(response.data.rsslink);
		});
	});

	$('#rssurl').on('click', function () {
		$('#rssurl').select();
	});

  $('.app-activity').delegate('.showORhide_activity','click', function() {
    $(this).closest('.activity-section').find('.showORhide_activity').show();
    
    if($(this).data('value') === 'show') {

      $(this).closest('.activity-section').find('.box:hidden').each(function(index) {
        
        index <= 10 && $(this).show();
      
      });

      $(this).closest('.activity-section').find('.showORhide_activity').length < 2 &&
        $(this).after($('<button class="showORhide_activity" data-value="hide">').text(t('activity','hide more activity data')));

      if(!$(this).closest('.activity-section').find('.box:hidden').length) {
        
        $(this).hide();
      
      }
    } else {
      console.dir(111);
      var visibleBox = $(this).closest('.activity-section').find('.box:visible');

      if(visibleBox.length > 10) {
        for(var i = 1; i<= 10 ; i++) {
          $(visibleBox[visibleBox.length - i]).hide();
          if(visibleBox.length - i === 10) break;
        }
      }
      

      if($(this).closest('.activity-section').find('.box:visible').length <= 10) {
        $(this).hide();

      }
    }
  
  });

});

