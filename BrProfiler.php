<?php

/**
 * Project:     Bright framework
 * Author:      Jager Mesh (jagermesh@gmail.com)
 *
 * @version 1.1.0.0
 * @package Bright Core
 */

require_once(__DIR__.'/BrSingleton.php');

class BrProfiler extends BrSingleton {

  private $completedMetricsDuration = array();
  private $completedMetricsMemory = array();
  private $activeMetrics = array();

  function start($name) {

    $this->activeMetrics[$name] = array( 'time'   => br()->getMicrotime()
                                       , 'memory' => memory_get_usage(true)
                                       );

    return $this->activeMetrics[$name];

  }

  function logStart($name) {

    $s = $this->start($name);
    br()->log()->writeLn($name. ', ' . br()->formatTraffic($s['memory']) , '+++');

  }

  function finish($name) {

    $duration = (br()->getMicroTime()   - $this->activeMetrics[$name]['time']);
    $memory   = (memory_get_usage(true) - $this->activeMetrics[$name]['memory']);

    unset($this->activeMetrics[$name]);
    if (!isset($this->completedMetricsDuration[$name])) {
      $this->completedMetricsDuration[$name] = array();
    }
    if (!isset($this->completedMetricsMemory[$name])) {
      $this->completedMetricsMemory[$name] = array();
    }
    $this->completedMetricsDuration[$name][] = $duration;
    $this->completedMetricsMemory[$name][] = $memory;

    $count         = count($this->completedMetricsDuration[$name]);
    $totalDuration = array_sum($this->completedMetricsDuration[$name]);
    $totalMemory   = array_sum($this->completedMetricsMemory[$name]);
    $avgDuration   = $totalDuration / $count;
    $avgMemory     = $totalMemory / $count;

    return array( 'count'         => $count
                , 'duration'      => $duration
                , 'memory'        => $memory
                , 'totalDuration' => $totalDuration
                , 'totalMemory'   => $totalMemory
                , 'avgDuration'   => $avgDuration
                , 'avgMemory'     => $avgMemory
                );

  }

  function logFinish($name, $comment = null) {

    $f = $this->finish($name);
    $s = $name. ': ' . br()->durationToString($f['duration']);
    if ($f['count'] > 1) {
      $s .= ' (cnt '            . $f['count'] .', '
            . 'total duration ' . br()->durationToString($f['totalDuration']) . ', '
            . 'total memory '   . br()->formatTraffic($f['totalMemory'])      . ', '
            . 'avg duration '   . br()->durationToString($f['avgDuration'])   . ', '
            . 'avg memory '     . br()->formatTraffic($f['avgMemory'])        .
             ')';
    }
    $s .=  ', ' . br()->formatTraffic($f['memory']);

    br()->log()->writeLn($s, '+++');
    if ($comment) {
      br()->log()->writeLn($name . ': ' . $comment , '+++');
    }
    return $f;

  }

}
