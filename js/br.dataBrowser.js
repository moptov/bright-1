/*!
 * Bright 0.0.5
 *
 * Copyright 2012, Sergiy Lavryk (jagermesh@gmail.com)
 * Dual licensed under the MIT or GPL Version 2 licenses.
  * http://brightfw.com
 *
 */

;(function ($, window) {

  function BrDataBrowser(entity, options) {

    var _this = this;

    var pagerSetuped = false;

    this.options = options || {};
    this.options.autoLoad = this.options.autoLoad || false;
    this.options.entity = entity;
    this.options.features = this.options.features || { editor: true };
    this.options.noun = this.options.noun || '';
    this.options.selectors = this.options.selectors || {};
    this.options.selectors.container = this.options.selectors.container || '';
    this.options.selectors.scrollContainer = this.options.selectors.scrollContainer || '';

    function c(selector) {
      if (_this.options.selectors.container !== '') {
        return _this.options.selectors.container + ' ' + selector;
      } else {
        return selector;
      }
    }

    this.scrollContainer = function() {
      if (_this.options.selectors.container !== '') {
        if (_this.options.selectors.scrollContainer !== '') {
          return _this.options.selectors.container + ' ' + _this.options.selectors.scrollContainer;
        } else {
          return _this.options.selectors.container;
        }
      } else {
        return _this.options.selectors.scrollContainer;
      }
    };

    this.options.selectors.dataTable = c(this.options.selectors.dataTable || '.data-table');
    this.options.selectors.editForm = this.options.selectors.editForm || '.data-edit-form';

    this.options.templates = this.options.templates || {};
    this.options.templates.row = this.options.templates.row || this.options.templates.rowTemplate || '.data-row-template';
    this.options.templates.groupRow = this.options.templates.groupRow || '.data-group-row-template';
    this.options.templates.noData = this.options.templates.noData || '.data-empty-template';

    var selActionCRUD = c('.action-edit') + ',' + c('.action-create') + ',' + c('.action-copy');

    if (typeof entity == 'string') {
      if (this.options.entity.indexOf('/') == -1) {
        this.dataSource = br.dataSource(br.baseUrl + 'api/' + this.options.entity + '/');
      } else {
        this.dataSource = br.dataSource(br.baseUrl + this.options.entity);
      }
      this.dataSource.on('error', function(operation, error) {
        br.growlError(error);
      });
    } else {
      this.dataSource = entity;
    }

    this.storageTag = document.location.pathname + this.dataSource.options.restServiceUrl;

    this.setStored = function(name, value) {
      br.storage.set(this.storageTag + 'stored:' + name, value);
    };

    this.getStored = function(name, defaultValue) {
      return br.storage.get(this.storageTag + 'stored:' + name, defaultValue);
    };

    this.defaultLimit = this.options.limit || 20;
    this.limit = _this.getStored('pager_PageSize', this.defaultLimit);
    this.skip = 0;
    this.recordsAmount = 0;

    this.selection = br.flagsHolder();

    this.countDataSource = br.dataSource(this.dataSource.options.restServiceUrl);

    var headerContainer = 'body';

    if (this.options.selectors.container !== '') {
      headerContainer = this.options.selectors.container;
    }

    this.dataGrid = br.dataGrid( this.options.selectors.dataTable
                               , this.options.templates.row
                               , this.dataSource
                               , { templates: { noData: this.options.templates.noData, groupRow: this.options.templates.groupRow }
                                 , selectors: { header: headerContainer, remove: '.action-delete' }
                                 }
                               );

    this.events = br.eventQueue(this);
    this.before = function(event, callback) { this.events.before(event, callback); };
    this.on     = function(event, callback) { this.events.on(event, callback); };
    this.after  = function(event, callback) { this.events.after(event, callback); };

    this.before = function(operation, callback) {
      this.dataSource.before(operation, callback);
      this.countDataSource.before(operation, callback);
    };

    this.getOrder = function() {
      return _this.dataGrid.getOrder();
    };

    this.setOrder = function(order) {
      _this.dataGrid.setOrder(order);
    };

    this.setFilter = function(name, value) {
      var filter = br.storage.get(this.storageTag + 'filter');
      filter = filter || { };
      filter[name] = value;
      br.storage.set(this.storageTag + 'filter', filter);
    };

    this.getFilter = function(name, defaultValue) {
      var filter = br.storage.get(this.storageTag + 'filter', defaultValue);
      filter = filter || { };
      return filter[name];
    };

    this.reloadRow = function(rowid) {
      _this.dataGrid.reloadRow(rowid);
    };

    this.init = function() {
      // nav
      $('.nav-item[rel=' + _this.options.nav + ']').addClass('active');

      _this.dataSource.before('select', function(request, options) {
        request = request || {};
        request.__skip = _this.skip;
        request.__limit = _this.limit;
        if ($(c('input.data-filter[name=keyword]')).length > 0) {
          request.keyword = $(c('input.data-filter[name=keyword]')).val();
          _this.setFilter('keyword', request.keyword);
        }
      });

      _this.dataSource.after('remove', function(request, options) {
        _this.resetPager();
        _this.updatePager();
      });

      _this.dataSource.after('insert', function(request, options) {
        _this.resetPager();
        _this.updatePager();
      });

      _this.countDataSource.before('select', function(request) {
        if ($(c('input.data-filter[name=keyword]')).length > 0) {
          request.keyword = $(c('input.data-filter[name=keyword]')).val();
        }
      });

      // search
      br.modified(c('input.data-filter[name=keyword]'), function() {
        var _val = $(this).val();
        $(c('input.data-filter[name=keyword]')).each(function() {
          if ($(this).val() != _val) {
            $(this).val(_val);
          }
        });
        _this.refreshDeferred();
      });

      br.modified(c('input.data-filter,select.data-filter'), function() {
        _this.resetPager();
      });

      if ($.datepicker) {
        $('input.datepicker').each(function() {
          if ($(this).attr('data-format')) {
            $(this).datepicker({ dateFormat: $(this).attr('data-format') });
          } else {
            $(this).datepicker({ });
          }
        });
      }

      if (_this.options.features.editor) {
        _this.editor = br.dataEditor(_this.options.selectors.editForm, _this.dataSource, { noun: _this.options.noun });
        _this.editor.events.connectTo(_this.events);

        $(c('.action-create')).show();

        $(document).on('click', selActionCRUD, function() {
          var isCopy = $(this).hasClass('action-copy');
          var rowid = $(this).closest('[data-rowid]').attr('data-rowid');
          _this.editor.show(rowid, isCopy);
        });
      }

      br.editable(c('.editable'), function(content) {
        var $this = $(this);
        var rowid = $this.closest('[data-rowid]').attr('data-rowid');
        var dataField = $this.attr('data-field');
        if (!br.isEmpty(rowid) && !br.isEmpty(dataField)) {
          var data = {};
          data[dataField] = content;
          _this.dataSource.update( rowid
                                 , data
                                 , function(result) {
                                     if (result) {
                                       br.editable($this, 'apply', content);
                                     }
                                   }
                                 );
        }
      });

      // pager
      $(c('.action-next')).click(function() {

        _this.skip += _this.limit;
        _this.refresh({}, null, true);

      });

      $(c('.action-prior')).click(function() {

        _this.skip -= _this.limit;
        if (_this.skip < 0) {
          _this.skip = 0;
        }
        _this.refresh({}, null, true);

      });

      $(c('.action-refresh')).click(function() {
        _this.refresh();
      });

      $(c('.action-clear-one-filter')).click(function() {
        $(c('.data-filter' + '[name=' + $(this).attr('rel') + ']')).val('');
        _this.refresh();
      });

      $(c('input.data-filter[name=keyword]')).val(_this.getFilter('keyword'));

      function showFiltersDesc() {

        if ($(c('.filters-panel')).is(':visible')) {
          $(c('.action-show-hide-filters')).find('span').text('Hide filters');
          $(c('.filter-description')).text('');
        } else {
          $(c('.action-show-hide-filters')).find('span').text('Show filters');
          var s = '';
          $(c('.data-filter')).each(function() {
            var val = $(this).val();
            var title = $(this).attr('title');
            if (val &&title) {
              s = s + '/ <strong>' + title + '</strong> ';
              if ($(this).is('select')) {
                s = s + $(this).find('option[value=' + val + ']').text() + ' ';
              } else {
                s = s + val + ' ';
              }

            }
          });
          $(c('.filter-description')).html(s);
        }

      }

      function setupFilters(initial) {

        function showHideFilters(initial) {

          if ($(c('.filters-panel')).is(':visible')) {
            _this.setStored('filters-hidden', true);
            if (initial) {
              $(c('.filters-panel')).hide();
              showFiltersDesc();
              _this.events.trigger('hideFilters');
            } else
            $(c('.filters-panel')).slideUp(function() {
              showFiltersDesc();
              _this.events.trigger('hideFilters');
            });
          } else {
            _this.setStored('filters-hidden', false);
            if (initial) {
              $(c('.filters-panel')).show();
              showFiltersDesc();
              _this.events.trigger('showFilters');
            } else
            $(c('.filters-panel')).slideDown(function() {
              showFiltersDesc();
              _this.events.trigger('showFilters');
            });
          }

        }

        $(c('.action-show-hide-filters')).on('click', function() {
          showHideFilters();
        });

        $(c('.action-reset-filters')).on('click', function () {
          _this.resetFilters();
        });

        if (_this.getStored('filters-hidden')) {
          showFiltersDesc();
        } else {
          showHideFilters(initial);
        }

      }

      setupFilters(true);

      _this.dataSource.after('select', function(result, response) {
        if (result) {
          if (_this.options.autoLoad) {
            _this.skip = _this.skip + response.length;
          }
        }
        _this.updatePager();
        showFiltersDesc();
      });

      function selectRow(id) {
        var row = $('tr[data-rowid=' + id + ']', $(_this.options.selectors.dataTable));
        row.find('.action-select-row').attr('checked', 'checked');
        row.addClass('row-selected');
      }

      function checkAutoLoad() {
        var docsHeight = $(_this.options.selectors.dataTable).height();
        var docsContainerHeight = $(_this.scrollContainer()).height();
        var scrollTop = $(_this.scrollContainer()).scrollTop();
        if (scrollTop + docsContainerHeight > docsHeight) {
          _this.dataGrid.loadMore();
        }
      }

      if (_this.options.autoLoad) {
        $(_this.scrollContainer()).on('scroll', function() {
          checkAutoLoad();
        });
      }

      $(document).on('click', c('.action-select-all'), function() {
        if ($(this).is(':checked')) {
          $(c('.action-select-row')).each(function() {
            $(this).attr('checked', 'checked');
            $(this).closest('tr').addClass('row-selected');
            _this.selection.append($(this).val());
          });
        } else {
          $(c('.action-select-row')).each(function() {
            $(this).removeAttr('checked');
            $(this).closest('tr').removeClass('row-selected');
            _this.selection.remove($(this).val());
          });
        }
        _this.events.trigger('selectionChanged');
      });

      $(document).on('click', c('.action-select-row'), function() {
        if ($(this).is(':checked')) {
          $(this).closest('tr').addClass('row-selected');
          _this.selection.append($(this).val());
        } else {
          $(this).closest('tr').removeClass('row-selected');
          _this.selection.remove($(this).val());
        }
        _this.events.trigger('selectionChanged');
      });

      $(document).on('click', c('.action-clear-selection'), function() {
        _this.clearSelection();
      });

      $(document).on('click', c('.action-delete-selected'), function() {
        var selection = _this.selection.get();
        if (selection.length > 0) {
          br.confirm( 'Delete confirmation'
                    , 'Are you sure you want delete ' + selection.length + ' record(s)?'
                    , function() {
                        for(var i in selection) {
                          /* jshint ignore:start */
                          (function(id) {
                            _this.dataSource.remove(id, function(result, response) {
                              if (result) {
                                _this.selection.remove(id);
                                _this.events.trigger('selectionChanged');
                              }
                            });
                          })(selection[i]);
                          /* jshint ignore:end */
                        }
                      }
                    );
        } else {
          br.growlError('Please select at least one record');
        }
      });

      _this.dataGrid.before('changeOrder', function() {
        _this.resetPager();
      });

      _this.dataGrid.on('change', function() {
        $(c('.action-select-all')).removeAttr('checked');
        if ($(c('.action-clear-selection')).length > 0) {
          var selection = _this.selection.get();
          for(var i in selection) {
            selectRow(selection[i]);
          }
        } else {
          _this.selection.clear();
        }
        _this.events.trigger('selectionChanged');
      });

      _this.events.on('selectionChanged', function() {
        var selection = _this.selection.get();
        if (selection.length > 0) {
          $(c('.selection-stat')).text(selection.length + ' record(s) currently selected');
          $(c('.selection-stat')).show();
          $(c('.action-clear-selection')).show();
        } else {
          $(c('.selection-stat')).hide();
          $(c('.action-clear-selection')).hide();
        }
      });

      return this;
    };

    var slider = false;

    if ($.fn.slider) {
      $(c('.pager-page-slider')).each(function() {
        slider = true;
        $(this).slider({
            min: 1
          , value: 1
          , change: function(event, ui) {
              var value = $(c('.pager-page-slider')).slider('option', 'value');
              if (value > 0) {
                var newSkip = _this.limit * (value - 1);
                if (newSkip != _this.skip) {
                  _this.skip = _this.limit * (value - 1);
                  _this.setStored('pager_PageNo', _this.skip);
                  _this.refresh({}, null, true);
                }
              }
            }
        });
      });

      $(c('.pager-page-size-slider')).each(function() {

        slider = true;
        $(this).slider({
            min: _this.defaultLimit
          , value: _this.limit
          , max: _this.defaultLimit * 20
          , step: _this.defaultLimit
          , change: function(event, ui) {
              var value = $(c('.pager-page-size-slider')).slider('option', 'value');
              _this.limit = value;
              _this.setStored('pager_PageSize', _this.limit);
              $(c('.pager-page-slider')).slider('option', 'value', 1);
              $(c('.pager-page-slider')).slider('option', 'max', Math.ceil(_this.recordsAmount / _this.limit));
              _this.refresh({}, null, true);
            }
        });
      });
    }

    function internalUpdatePager() {

      if (slider) {
        $(c('.pager-page-slider')).slider('option', 'max', Math.ceil(_this.recordsAmount / _this.limit));
        $(c('.pager-page-slider')).slider('option', 'value', Math.ceil(_this.skip / _this.limit) + 1);
      }
      var min = (_this.skip + 1);
      var max = Math.min(_this.skip + _this.limit, _this.recordsAmount);
      if (_this.recordsAmount > 0) {
        $(c('.pager-control')).show();
        if (_this.recordsAmount > max) {
          $(c('.action-next')).show();
        } else {
          $(c('.action-next')).hide();
        }
        if (_this.skip > 0) {
          $(c('.action-prior')).show();
        } else {
          $(c('.action-prior')).hide();
        }
      } else {
        $(c('.pager-control')).hide();
      }
      $(c('.pager-stat')).text('Records ' + min + '-' + max + ' of ' + _this.recordsAmount);
      $(c('.pager-page-size')).text(_this.limit + ' records per page');

      pagerSetuped = true;

    }

    this.clearSelection = function() {
      _this.selection.clear();
      $(c('.action-select-row')).removeAttr('checked');
      $(c('tr.row-selected')).removeClass('row-selected');
      $(c('.action-select-all')).removeAttr('checked');
      _this.events.trigger('selectionChanged');
    };

    this.getSelection = function() {
      return _this.selection.get();
    };

    this.updatePager = function() {

      if (!pagerSetuped) {

        _this.countDataSource.selectCount(function(success, result) {
          if (success) {
            _this.recordsAmount = result;
            internalUpdatePager();
            _this.events.triggerAfter('recordsCountRetrieved', result);
          } else {
            $(c('.pager-control')).hide();
          }
        });

      } else {
        internalUpdatePager();
      }

    };

    function internalRefresh(deferred, filter, callback) {

      if (deferred) {
        _this.dataSource.deferredSelect(filter, function() {
          if (typeof callback == 'function') {
            callback.call(this);
          }
        });
      } else {
        _this.dataSource.select(filter, function() {
          if (typeof callback == 'function') {
            callback.call(this);
          }
        });
      }

    }

    this.isFiltersVisible = function() {
      return $(c('.filters-panel')).is(':visible');
    };

    this.resetPager = function() {
      pagerSetuped = false;
      _this.skip = 0;
    };

    this.resetFilters = function() {
      $(c('input.data-filter')).val('');
      $(c('select.data-filter')).val('');
      $(c('select.data-filter')).trigger('reset');
      br.storage.remove(this.storageTag + 'filter');
      _this.events.trigger('resetFilters');
      br.refresh();
    };

    this.refreshDeferred = function(filter, callback, doNotResetPager) {
      if (typeof filter == 'function') {
        doNotResetPager = callback;
        callback = filter;
        filter = {};
      }
      if (!doNotResetPager) {
        _this.resetPager();
      }
      internalRefresh(true, filter, callback);
    };

    this.refresh = function(filter, callback, doNotResetPager) {
      if (typeof filter == 'function') {
        doNotResetPager = callback;
        callback = filter;
        filter = {};
      }
      if (!doNotResetPager) {
        _this.resetPager();
      }
      internalRefresh(false, filter, callback);
    };

    return this.init();

  }

  window.br = window.br || {};

  window.br.dataBrowser = function (entity, options) {
    return new BrDataBrowser(entity, options);
  };

})(jQuery, window);
