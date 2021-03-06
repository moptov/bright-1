<?php

/**
 * Project:     Bright framework
 * Author:      Jager Mesh (jagermesh@gmail.com)
 *
 * @version 1.1.0.0
 * @package Bright Core
 */

require_once(__DIR__.'/Br.php');
require_once(__DIR__.'/BrSingleton.php');

class BrLog extends BrSingleton {

  private $initTime = null;
  private $initMicroTime = null;
  private $logLevel = 0;
  private $adapters = array();

  function __construct() {

    parent::__construct();

    $this->initMicroTime = Br()->getMicrotime();
    $this->initTime = @strftime('%H:%M:%S');
    if (br()->config()->has('br/log/enabled')) {
      if (!br()->config()->get('br/log/enabled')) {
        $this->disable();
      }
    }
  }

  function addAdapter($adapter) {

    $this->adapters[] = $adapter;

  }

  function getInitMicroTime() {

    return $this->initMicroTime;

  }

  function getAdapters() {

    return $this->adapter;

  }

  function adaptersCount() {

    return count($this->adapters);

  }

  function isAdapterExists($name) {

    foreach($this->adapters as $adapter) {
      if (get_class($adapter) == $name) {
        return true;
      }
    }

    return false;

  }

  function getInitTime() {

    return $this->initTime;

  }

  function getTimeOffset() {

    return Br()->GetMicrotime() - $this->initMicroTime;

  }

  function getFormattedTimeOffset() {

    return Br()->FormatDuration($this->getTimeOffset());

  }

  private function writeToAdapters($message, $group = 'MSG', $tagline = '') {

    if ($this->isEnabled()) {

      if (is_array($message)) {
        if (count($message)) {
          $logText = var_export($message, true);
        } else {
          $logText = '[Empty Array]';
        }
      } else
      if (is_object($message)) {
        $logText = var_export($message, true);
      } else {
        $logText = $message;
      }

      $time = Br()->FormatDuration(Br()->GetMicrotime() - $this->initMicroTime);
      foreach($this->adapters as $adapter) {
        switch($group) {
          case 'DBG':
            $adapter->writeDebug($logText, $tagline);
            break;
          case 'ERR':
            $adapter->writeError($logText, $tagline);
            break;
          default:
            $adapter->writeMessage($logText, $group ? $group : 'MSG', $tagline);
            break;
        }
      }

    }

  }

  function incLevel() {

    $this->logLevel++;

  }

  function decLevel() {

    $this->logLevel--;
    if ($this->logLevel < 0) {
      $this->logLevel = 0;
    }

  }

  function resetLevel() {

    $this->logLevel = 0;

  }

  function getLevel() {

    return $this->logLevel >= 0 ? $this->logLevel : 0;

  }

  function write($message, $group = 'MSG') {

    $this->writeToAdapters($message, $group);

  }

  function writeLn($message = '', $group = 'MSG', $tagline = '') {

    $this->writeToAdapters($message, $group, $tagline);

  }

  function formatCallParams($params, $level = 0) {
    $result = '';
    foreach($params as $idx => $arg) {
      if ($level > 0) {
        $result .= '\'' . $idx . '\' => ';
      }
      if (is_array($arg)) {
        $result .= 'array(';
        if (count($arg) > 0) {
          if ($level > 3) {
            $result .= '...';
          } else {
            $result .= $this->formatCallParams($arg, $level + 1);
          }
        }
        $result .= ')';
      } else
      if (is_numeric($arg)) {
        $result .= $arg;
      } else
      if (is_object($arg)) {
        $result .= '[' . get_class($arg) . ']';
      } else
      if (is_resource($arg)) {
        $result .= '[' . get_resource_type($arg) . ']';
      } else
      if (!$arg) {
        $result .= 'null';
      } else {
        $s = (string)$arg;
        if (strlen($s) > 255) {
          $s = substr($s, 0, 255) . '...';
        }
        $result .= '\'' . $s . '\'';
      }
      $result .= ', ';
    }
    return rtrim($result, ', ');

  }

  function formatStackTraceCall($trace) {

    $result = '';
    if (br($trace, 'class')) {
      $result .= $trace['class'];
    }
    if (br($trace, 'type')) {
      $result .= $trace['type'];
    }
    $result .= $trace['function'] . '(';
    if (br($trace, 'args')) {
      $result .= $this->formatCallParams($trace['args']);
    }
    $result = rtrim($result, ', ');
    $result .= ');';

    return $result;

  }

  function formatStackTraceSource($trace) {

    $result = '';
    if (br($trace, 'file')) {
      $result .= $trace['file'];
    } else {
      $result .= __FILE__;
    }
    if (br($trace, 'line')) {
      $result .= ', ' . $trace['line'];
    }

    return $result;

  }

  //

  public function logException($e) {

    if ($e instanceof BrErrorException) {
      $isFatal = $e->IsFatal();
    } else {
      $isFatal = true;
    }
    $type = (($e instanceof BrErrorException) ? $e->getType() : 'Error');
    $errorMessage = $e->getMessage();
    $errorInfo = '';
    if (preg_match('/\[INFO:([^]]+)\](.+)\[\/INFO\]/ism', $errorMessage, $matches)) {
      $info_name = $matches[1];
      $errorInfo = $matches[2];
      $errorMessage = str_replace('[INFO:'.$info_name.']'.$errorInfo.'[/INFO]', '', $errorMessage);
    }
    $errorLog = '';
    if ($isFatal) {
      $errorLog .= '[FATAL] ';
    }
    $errorLog .= $type . ': ' . $errorMessage;
    $errorLog .= "\n" . '  ' . $e->getFile() . ', line ' . $e->getLine();
    if ($errorInfo) {
      $errorLog .= "\n" . '  ' . $errorInfo;
    }

    if ($e instanceof BrErrorException) {
      $idx = 0;
    } else {
      $idx = 1;
    }
    foreach($e->getTrace() as $index => $statement) {
      if ($idx) {
        $errorLog .= "\n" . '    ' . $this->formatStackTraceCall($statement);
        $errorLog .= "\n" . '    ' . $this->formatStackTraceSource($statement);
      }
      $idx++;
    }

    $this->writeLn($errorLog, 'ERR', $errorMessage);

    return $errorLog;

  }

  public function error($message, $object = null) {

    if ($object) {
      $message = get_class($object) . ' :: ' . $message;
    }
    $this->writeToAdapters($message, 'ERR');

  }


  public function callStack() {

    try {
      throw new BrCallStackException();
    } catch (Exception $e) {
      $callStackInfo = 'CALLSTACK';
      $idx = 0;
      foreach($e->getTrace() as $index => $statement) {
        if ($idx) {
          $callStackInfo .= "\n" . '  ' . $this->formatStackTraceCall($statement);
          $callStackInfo .= "\n" . '  ' . $this->formatStackTraceSource($statement);
        }
        $idx++;
      }
      $this->writeLn($callStackInfo, 'DBG');

      if (br()->isConsoleMode()) {

      } else {
        include(__DIR__.'/templates/CallStack.html');
      }
    }

  }

  public function debug() {

    $args = func_get_args();
    foreach($args as $var) {
      $this->writeToAdapters($var, 'DBG');

      $message = print_r($var, true);
      if (br()->isConsoleMode()) {

      } else
      if (br()->request()->isLocalHost()) {
        include(__DIR__.'/templates/DebugMessage.html');
      }
    }

  }

}

