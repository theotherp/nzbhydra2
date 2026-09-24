package base

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestReadVmSettingsFromIndentedMainSection(t *testing.T) {
	yaml := `main:
  apiKey: "abc"
  customVmOptions: "-XX:+UseSerialGC"
  logGc: true
  xmx: 1024
searching:
  timeout: 20
`
	xmx, logGc, customVmOptions, err := readVmSettings(strings.NewReader(yaml))

	assert.NoError(t, err)
	assert.Equal(t, "1024", xmx)
	assert.True(t, logGc)
	assert.Equal(t, "-XX:+UseSerialGC", customVmOptions)
}

func TestReadVmSettingsWithDefaults(t *testing.T) {
	yaml := `main:
  customVmOptions: null
  logGc: false
`
	xmx, logGc, customVmOptions, err := readVmSettings(strings.NewReader(yaml))

	assert.NoError(t, err)
	assert.Equal(t, "", xmx)
	assert.False(t, logGc)
	assert.Equal(t, "", customVmOptions)
}
